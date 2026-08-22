'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { differenceInDays, parseISO, format } from 'date-fns'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Reutiliza el mismo patrón de auth-filter que el resto de reportes
async function getAuthFilter() {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const sb = getAdminClient()
  const { data: myProfile } = await sb
    .from('users')
    .select('institution_id, roles(name)')
    .eq('id', user.id)
    .single()
  const profile = myProfile as any
  const isSuperAdmin = profile?.roles?.name === 'Super Admin'
  return { isSuperAdmin, institutionId: myProfile?.institution_id as string | null }
}

// Mapeo EPS+Regimen combinado → separados
function parseEpsRegimen(combined: string | null): { entidad: string; regimen: string } {
  if (!combined) return { entidad: '—', regimen: '—' }
  const val = combined.trim()
  if (val === 'Nueva EPS Subsidiado')   return { entidad: 'Nueva EPS', regimen: 'Subsidiado' }
  if (val === 'Nueva EPS Contributivo') return { entidad: 'Nueva EPS', regimen: 'Contributivo' }
  if (val === 'Particular')             return { entidad: 'Particular', regimen: 'Particular' }
  // Fallback genérico: última palabra es el régimen
  const parts = val.split(' ')
  if (parts.length > 1) {
    return { entidad: parts.slice(0, -1).join(' '), regimen: parts[parts.length - 1] }
  }
  return { entidad: val, regimen: '—' }
}

// Mapeo Servicio → Código CUPS (mismo que en el action de asignación de citas)
const CUPS_MAP: Record<string, string> = {
  'Cirugia':          '890222',
  'Cirugía':          '890222',
  'Endodoncia':       '890218',
  'Odontopediatría':  '890220',
  'Odontopediatria':  '890220',
  'Rehabilitación':   '890224',
  'Rehabilitacion':   '890224',
  'Primera Vez':      '890203',
  'Periodoncia':      '890221',
  'Ortodoncia':       '890223',
  'Prótesis':         '',   // por definir
  'Protesis':         '',
}


// Lee el campo `attended` (boolean, columna histórica del módulo de citas)
// y también `attendance_status` (nuevo campo para la Circular 1552).
// Para citas ya pasadas sin marcar, infiere "Sin Confirmar".
function attendanceLabel(
  attended: boolean | null,
  attendanceStatus: string | null,
  cancelled: boolean,
  appointmentDate: string
): string {
  if (cancelled || attendanceStatus === 'cancelled') return 'Cancelada'
  // Columna `attended` (la que ya usa el módulo de citas)
  if (attended === true)  return 'Asistió'
  if (attended === false) return 'No Asistió'
  // Columna nueva `attendance_status`
  if (attendanceStatus === 'attended')  return 'Asistió'
  if (attendanceStatus === 'no_show')   return 'No Asistió'
  // Inferencia inteligente: si la cita ya pasó y no fue marcada → Sin Confirmar
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const citaDate = appointmentDate ? new Date(appointmentDate) : null
  if (citaDate && citaDate < today) return 'Sin Confirmar'
  return 'Pendiente'
}

export interface Circular1552Row {
  tipoDocumento:     string
  numeroDocumento:   string
  codigoPrestador:   string
  nombrePrestador:   string
  entidad:           string
  regimen:           string
  servicio:          string
  codigoCups:        string
  fechaSolicitud:    string  // DD/MM/AAAA
  fechaAsignacion:   string  // DD/MM/AAAA
  fechaCita:         string  // DD/MM/AAAA
  horaCita:          string
  oportunidad:       number  // días entre solicitud y asignación
  medico:            string
  especialidad:      string
  estadoCita:        string
  canal:             string  // 'online' | 'presencial'
}

export async function fetchCircular1552Report(from?: string, to?: string): Promise<Circular1552Row[]> {
  const filter = await getAuthFilter()
  if (!filter) return []

  const sb = getAdminClient()

  let data: any[]
  try {
    let query = sb
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        doctor_name,
        specialty,
        codigo_cups,
        attendance_status,
        attended,
        cancelled,
        created_at,
        requests!inner (
          id,
          patient_document_type,
          patient_document_number,
          patient_data_json,
          type,
          created_at,
          canal,
          institution_id,
          institutions (
            name,
            codigo_prestador
          )
        )
      `)
      .order('appointment_date', { ascending: true })

    // Filtrar por fecha de cita si se especifica rango
    if (from) query = query.gte('appointment_date', from)
    if (to)   query = query.lte('appointment_date', to)

    // ── FILTRO POR INSTITUCIÓN (clave de seguridad) ────────────────────────────
    // Super Admin ve todas. Admin/Gestor solo ve su institución.
    if (!filter.isSuperAdmin && filter.institutionId) {
      query = query.eq('requests.institution_id', filter.institutionId)
    }

    const { data: result, error } = await query
    if (error) {
      console.error('Circular 1552 fetch error:', error?.message)
      return []
    }
    data = result || []
  } catch (err) {
    console.error('Circular 1552 query exception:', err)
    return []
  }

  return data.map((appt: any) => {
    try {
      const req  = appt.requests
      const inst = req?.institutions

      const patientData = req?.patient_data_json || {}

      // Buscar EPS en los datos del paciente (campo dinámico del formulario)
      const epsRaw = patientData['Entidad / EPS']
        || patientData['entidad_eps']
        || patientData['eps']
        || null
      const { entidad, regimen } = parseEpsRegimen(epsRaw)

      // Calcular oportunidad:
      // Días entre la solicitud del paciente y la fecha en que el gestor asignó la cita.
      // Esto mide el tiempo de respuesta institucional, que es lo que regula la Resolución 1552.
      const solicitudDate  = req?.created_at        ? parseISO(req.created_at)           : null
      const asignacionDate = appt.created_at        ? parseISO(appt.created_at)          : null
      const citaDate       = appt.appointment_date  ? parseISO(appt.appointment_date)    : null
      const oportunidad    = solicitudDate && asignacionDate
        ? differenceInDays(asignacionDate, solicitudDate)
        : 0

      // "Servicio" = campo "Tipo de Solicitud" del formulario dinámico (ej: Primera Vez, Prótesis)
      // NO es req.type que contiene el "Trámite a Solicitar" (Solicitud de Cita / Procedimientos)
      const servicioFinal = patientData['Tipo de Solicitud']
        || patientData['Tipo de Cita']
        || req?.type
        || '—'

      // CUPS: primero BD, luego fallback por nombre del servicio
      const codigoCups = appt.codigo_cups || CUPS_MAP[servicioFinal] || '—'

      return {
        tipoDocumento:   req?.patient_document_type  || '—',
        numeroDocumento: req?.patient_document_number || '—',
        codigoPrestador: inst?.codigo_prestador       || '—',
        nombrePrestador: inst?.name                   || '—',
        entidad,
        regimen,
        servicio:        servicioFinal,
        codigoCups,
        fechaSolicitud:  solicitudDate  ? format(solicitudDate,  'dd/MM/yyyy') : '—',
        fechaAsignacion: asignacionDate ? format(asignacionDate, 'dd/MM/yyyy') : '—',
        fechaCita:       citaDate       ? format(citaDate,       'dd/MM/yyyy') : '—',
        horaCita:        appt.appointment_time || '—',
        oportunidad,
        medico:          appt.doctor_name || '—',
        especialidad:    appt.specialty   || '—',
        estadoCita:      attendanceLabel(
          appt.attended          ?? null,
          appt.attendance_status ?? null,
          appt.cancelled         ?? false,
          appt.appointment_date  ?? ''
        ),
        canal: req?.canal === 'presencial' ? 'Presencial' : 'Online',
      }
    } catch (err) {
      console.error('Error procesando fila Circular 1552:', err, appt?.id)
      return null
    }
  }).filter(Boolean) as Circular1552Row[]
}

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

// Mapeo estado de asistencia → texto para el reporte
function attendanceLabel(status: string | null, cancelled: boolean): string {
  if (cancelled || status === 'cancelled') return 'Cancelada'
  if (status === 'attended')  return 'Asistió'
  if (status === 'no_show')   return 'No Asistió'
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
  oportunidad:       number  // días entre solicitud y fecha de cita
  medico:            string
  especialidad:      string
  estadoCita:        string
}

export async function fetchCircular1552Report(from?: string, to?: string): Promise<Circular1552Row[]> {
  const filter = await getAuthFilter()
  if (!filter) return []

  const sb = getAdminClient()

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
      cancelled,
      created_at,
      requests!inner (
        id,
        patient_document_type,
        patient_document_number,
        patient_data_json,
        type,
        created_at,
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

  const { data, error } = await query
  if (error || !data) {
    console.error('Circular 1552 fetch error:', error)
    return []
  }

  return data.map((appt: any) => {
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
    const solicitudDate   = req?.created_at    ? parseISO(req.created_at)    : null
    const asignacionDate  = appt.created_at    ? parseISO(appt.created_at)   : null
    const citaDate        = appt.appointment_date ? parseISO(appt.appointment_date) : null
    const oportunidad     = solicitudDate && asignacionDate
      ? differenceInDays(asignacionDate, solicitudDate)
      : 0

    return {
      tipoDocumento:   req?.patient_document_type || '—',
      numeroDocumento: req?.patient_document_number || '—',
      codigoPrestador: inst?.codigo_prestador || '—',
      nombrePrestador: inst?.name || '—',
      entidad,
      regimen,
      servicio:        req?.type || '—',
      codigoCups:      appt.codigo_cups || '—',
      fechaSolicitud:  solicitudDate ? format(solicitudDate, 'dd/MM/yyyy') : '—',
      fechaAsignacion: appt.created_at ? format(parseISO(appt.created_at), 'dd/MM/yyyy') : '—',
      fechaCita:       citaDate ? format(citaDate, 'dd/MM/yyyy') : '—',
      horaCita:        appt.appointment_time || '—',
      oportunidad,
      medico:          appt.doctor_name || '—',
      especialidad:    appt.specialty || '—',
      estadoCita:      attendanceLabel(appt.attendance_status, appt.cancelled),
    }
  })
}

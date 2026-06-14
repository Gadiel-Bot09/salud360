'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthFilter() {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const sb = getAdminClient()
  const { data: myProfile } = await sb.from('users').select('institution_id, roles(name)').eq('id', user.id).single()
  
  const isSuperAdmin = myProfile?.roles?.name === 'Super Admin'
  return { isSuperAdmin, institutionId: myProfile?.institution_id }
}

// ── 1. Solicitudes por Entidad ────────────────────────────────────────────────
export interface InstitutionReport {
  institution: string
  total: number
  received: number
  processing: number
  responded: number
  closed: number
  escalated: number
}

export async function fetchRequestsByInstitution(from?: string, to?: string): Promise<InstitutionReport[]> {
  const filter = await getAuthFilter()
  if (!filter) return []
  
  const sb = getAdminClient()
  let query = sb
    .from('requests')
    .select('status, institution_id, institutions(name)')

  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59Z')
  if (!filter.isSuperAdmin && filter.institutionId) {
    query = query.eq('institution_id', filter.institutionId)
  }

  const { data, error } = await query
  if (error || !data) { console.error(error); return [] }

  const map: Record<string, InstitutionReport> = {}
  for (const r of data as any[]) {
    const name = r.institutions?.name || 'Sin Institución'
    if (!map[name]) map[name] = { institution: name, total: 0, received: 0, processing: 0, responded: 0, closed: 0, escalated: 0 }
    map[name].total++
    if (r.status in map[name]) (map[name] as any)[r.status]++
  }

  return Object.values(map).sort((a, b) => b.total - a.total)
}

// ── 2. Solicitudes por Tipo/Especialidad ─────────────────────────────────────
export interface TypeReport {
  type: string
  total: number
  responded: number
  avg_days: number
}

export async function fetchRequestsByType(from?: string, to?: string): Promise<TypeReport[]> {
  const filter = await getAuthFilter()
  if (!filter) return []

  const sb = getAdminClient()
  let query = sb.from('requests').select('type, status, created_at, updated_at, institution_id')
  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59Z')
  if (!filter.isSuperAdmin && filter.institutionId) {
    query = query.eq('institution_id', filter.institutionId)
  }

  const { data, error } = await query
  if (error || !data) { console.error(error); return [] }

  const map: Record<string, { total: number; responded: number; totalDays: number }> = {}
  for (const r of data as any[]) {
    const t = r.type || 'Sin Tipo'
    if (!map[t]) map[t] = { total: 0, responded: 0, totalDays: 0 }
    map[t].total++
    if (r.status === 'responded' || r.status === 'closed') {
      map[t].responded++
      const days = (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24)
      map[t].totalDays += days
    }
  }

  return Object.entries(map).map(([type, v]) => ({
    type,
    total: v.total,
    responded: v.responded,
    avg_days: v.responded > 0 ? Math.round((v.totalDays / v.responded) * 10) / 10 : 0
  })).sort((a, b) => b.total - a.total)
}

// ── 3. Actividad por Usuario Gestor ──────────────────────────────────────────
export interface UserActivityReport {
  user_email: string
  role: string
  actions: number
  responded: number
  comments: number
}

export async function fetchActivityByUser(from?: string, to?: string): Promise<UserActivityReport[]> {
  const filter = await getAuthFilter()
  if (!filter) return []

  const sb = getAdminClient()
  let query = sb
    .from('request_history')
    .select('user_id, action, comment, to_status, created_at, requests!inner(institution_id)')
    .not('user_id', 'is', null)

  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59Z')
  if (!filter.isSuperAdmin && filter.institutionId) {
    query = query.eq('requests.institution_id', filter.institutionId)
  }

  const { data: history, error } = await query
  if (error || !history) { console.error(error); return [] }

  const userIds = [...new Set((history as any[]).map(h => h.user_id))]
  const { data: users } = await sb.from('users').select('id, email, roles(name)').in('id', userIds)
  const userMap: Record<string, { email: string; role: string }> = {}
  for (const u of (users || []) as any[]) userMap[u.id] = { email: u.email, role: u.roles?.name || 'Desconocido' }

  const map: Record<string, UserActivityReport> = {}
  for (const h of history as any[]) {
    const uid = h.user_id
    if (!map[uid]) map[uid] = {
      user_email: userMap[uid]?.email || uid,
      role: userMap[uid]?.role || '—',
      actions: 0,
      responded: 0,
      comments: 0
    }
    map[uid].actions++
    if (h.to_status === 'responded' || h.to_status === 'closed') map[uid].responded++
    if (h.comment) map[uid].comments++
  }

  return Object.values(map).sort((a, b) => b.actions - a.actions)
}

// ── 4. Tiempos de Respuesta SLA ───────────────────────────────────────────────
export interface SLAReport {
  institution: string
  total: number
  avg_response_days: number
  max_days: number
  on_time: number // responded within 5 days
}

export async function fetchSLAReport(from?: string, to?: string): Promise<SLAReport[]> {
  const filter = await getAuthFilter()
  if (!filter) return []

  const sb = getAdminClient()
  let query = sb.from('requests')
    .select('status, created_at, updated_at, institution_id, institutions(name)')
    .in('status', ['responded', 'closed'])

  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59Z')
  if (!filter.isSuperAdmin && filter.institutionId) {
    query = query.eq('institution_id', filter.institutionId)
  }

  const { data, error } = await query
  if (error || !data) { console.error(error); return [] }

  const map: Record<string, { total: number; totalDays: number; maxDays: number; onTime: number }> = {}
  for (const r of data as any[]) {
    const name = (r as any).institutions?.name || 'Sin Institución'
    if (!map[name]) map[name] = { total: 0, totalDays: 0, maxDays: 0, onTime: 0 }
    const days = (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24)
    map[name].total++
    map[name].totalDays += days
    if (days > map[name].maxDays) map[name].maxDays = days
    if (days <= 5) map[name].onTime++
  }

  return Object.entries(map).map(([institution, v]) => ({
    institution,
    total: v.total,
    avg_response_days: Math.round((v.totalDays / v.total) * 10) / 10,
    max_days: Math.round(v.maxDays),
    on_time: v.onTime
  })).sort((a, b) => a.avg_response_days - b.avg_response_days)
}

// ── 5. Tendencia de Radicación ────────────────────────────────────────────────
export interface TrendPoint {
  date: string
  total: number
  responded: number
}

export async function fetchTrendData(from?: string, to?: string): Promise<TrendPoint[]> {
  const filter = await getAuthFilter()
  if (!filter) return []

  const sb = getAdminClient()
  const defaultFrom = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const defaultTo   = to   || new Date().toISOString().split('T')[0]

  let query = sb.from('requests')
    .select('created_at, status, institution_id')
    .gte('created_at', defaultFrom)
    .lte('created_at', defaultTo + 'T23:59:59Z')
    
  if (!filter.isSuperAdmin && filter.institutionId) {
    query = query.eq('institution_id', filter.institutionId)
  }

  const { data, error } = await query

  if (error || !data) { console.error(error); return [] }

  const map: Record<string, TrendPoint> = {}
  // Pre-fill date range
  const cur = new Date(defaultFrom)
  while (cur.toISOString().split('T')[0] <= defaultTo) {
    const key = cur.toISOString().split('T')[0]
    map[key] = { date: key, total: 0, responded: 0 }
    cur.setDate(cur.getDate() + 1)
  }

  for (const r of data as any[]) {
    const key = new Date(r.created_at).toISOString().split('T')[0]
    if (map[key]) {
      map[key].total++
      if (r.status === 'responded' || r.status === 'closed') map[key].responded++
    }
  }

  return Object.values(map)
}

// ── 6. Pendientes Críticos ────────────────────────────────────────────────────
export interface PendingCritical {
  radicado: string
  type: string
  institution: string
  patient_email: string
  status: string
  days_open: number
}

export async function fetchPendingCriticals(minDays = 5): Promise<PendingCritical[]> {
  const filter = await getAuthFilter()
  if (!filter) return []

  const sb = getAdminClient()
  const cutoff = new Date(Date.now() - minDays * 24 * 60 * 60 * 1000).toISOString()

  let query = sb.from('requests')
    .select('radicado, type, patient_email, status, created_at, institution_id, institutions(name)')
    .in('status', ['received', 'processing', 'escalated'])
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true })

  if (!filter.isSuperAdmin && filter.institutionId) {
    query = query.eq('institution_id', filter.institutionId)
  }

  const { data, error } = await query

  if (error || !data) { console.error(error); return [] }

  return (data as any[]).map(r => ({
    radicado: r.radicado,
    type: r.type,
    institution: r.institutions?.name || '—',
    patient_email: r.patient_email,
    status: r.status,
    days_open: Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))
  })).sort((a, b) => b.days_open - a.days_open)
}

// ── 7. Reporte de Asistencia a Citas ─────────────────────────────────────────
export interface AttendanceReportRow {
  institution: string
  total_appointments: number
  attended: number
  absent: number
  pending: number
  attendance_rate: number
}

export async function fetchAttendanceReport(from?: string, to?: string): Promise<AttendanceReportRow[]> {
  const filter = await getAuthFilter()
  if (!filter) return []

  const sb = getAdminClient()
  let query = sb
    .from('appointments')
    .select('attended, requests!inner(institution_id, institutions(name))')

  if (from) query = query.gte('appointment_date', from)
  if (to)   query = query.lte('appointment_date', to)

  if (!filter.isSuperAdmin && filter.institutionId) {
    query = query.eq('requests.institution_id', filter.institutionId)
  }

  const { data, error } = await query
  if (error || !data) { console.error(error); return [] }

  const map: Record<string, { total: number; attended: number; absent: number; pending: number }> = {}
  for (const a of data as any[]) {
    const name = (a.requests as any)?.institutions?.name || 'Sin Institución'
    if (!map[name]) map[name] = { total: 0, attended: 0, absent: 0, pending: 0 }
    map[name].total++
    if (a.attended === true)  map[name].attended++
    else if (a.attended === false) map[name].absent++
    else map[name].pending++
  }

  return Object.entries(map).map(([institution, v]) => ({
    institution,
    total_appointments: v.total,
    attended: v.attended,
    absent: v.absent,
    pending: v.pending,
    attendance_rate: v.total > 0 ? Math.round((v.attended / v.total) * 100) : 0
  })).sort((a, b) => b.total_appointments - a.total_appointments)
}

// ── 7b. Detalle de Citas por Institución ──────────────────────────────────────
export interface AttendanceDetailRow {
  radicado: string
  patient_name: string
  patient_email: string
  specialty: string
  doctor_name: string
  appointment_date: string
  appointment_time: string
  attendance_status: 'attended' | 'absent' | 'pending'
  attended_at: string | null
  attendance_notes: string | null
  institution: string
}

export async function fetchAttendanceDetail(
  institutionName: string,
  from?: string,
  to?: string
): Promise<AttendanceDetailRow[]> {
  const filter = await getAuthFilter()
  if (!filter) return []

  const sb = getAdminClient()

  let query = sb
    .from('appointments')
    .select(`
      appointment_date,
      appointment_time,
      specialty,
      doctor_name,
      attended,
      attended_at,
      attendance_notes,
      requests!inner(
        radicado,
        patient_email,
        patient_data_json,
        institution_id,
        institutions(name)
      )
    `)
    .order('appointment_date', { ascending: false })
    .limit(500)

  if (from) query = query.gte('appointment_date', from)
  if (to)   query = query.lte('appointment_date', to)

  if (!filter.isSuperAdmin && filter.institutionId) {
    query = query.eq('requests.institution_id', filter.institutionId)
  }

  // Filtrar por institución si no es SuperAdmin o si se pasa el nombre
  if (institutionName && institutionName !== '__ALL__') {
    const { data: inst } = await sb.from('institutions').select('id').eq('name', institutionName).single()
    if (inst) query = query.eq('requests.institution_id', inst.id)
  }

  const { data, error } = await query
  if (error || !data) { console.error('fetchAttendanceDetail error:', error); return [] }

  return (data as any[]).map(r => {
    const req = r.requests || {}
    const json = req.patient_data_json || {}
    const name = json['Nombre Completo'] || json['nombre'] || json['nombre_completo'] || json['fullName'] || '—'
    const status: 'attended' | 'absent' | 'pending' =
      r.attended === true ? 'attended' : r.attended === false ? 'absent' : 'pending'

    return {
      radicado: req.radicado || '—',
      patient_name: name,
      patient_email: req.patient_email || '—',
      specialty: r.specialty || '—',
      doctor_name: r.doctor_name || '—',
      appointment_date: r.appointment_date,
      appointment_time: r.appointment_time || '—',
      attendance_status: status,
      attended_at: r.attended_at ? new Date(r.attended_at).toLocaleDateString('es-CO') : null,
      attendance_notes: r.attendance_notes || null,
      institution: req.institutions?.name || '—'
    }
  })
}



// ── 8. Detalle (Drill-Down) de solicitudes ────────────────────────────────────
export interface RequestDetailRow {
  radicado: string
  patient_name: string
  patient_email: string
  type: string
  status: string
  created_at: string
  resolved_at: string | null  // fecha de resolución si aplica
  days_open: number           // días reales (hasta resolución si cerrada, sino hasta hoy)
  institution: string
}

// Calcula los días reales entre apertura y cierre (o hasta hoy si sigue abierta)
function calcDays(createdAt: string, status: string, updatedAt: string | null): number {
  const start = new Date(createdAt).getTime()
  const isResolved = status === 'responded' || status === 'closed'
  const end = isResolved && updatedAt ? new Date(updatedAt).getTime() : Date.now()
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)))
}

export async function fetchRequestsDetail(
  filterType: 'institution' | 'type' | 'user',
  filterValue: string,
  from?: string,
  to?: string
): Promise<RequestDetailRow[]> {
  const filter = await getAuthFilter()
  if (!filter) return []

  const sb = getAdminClient()

  // ── Caso especial: filtrar por usuario gestor (via request_history) ──────────
  if (filterType === 'user') {
    // 1. Buscar el user_id por email
    const { data: userRow } = await sb
      .from('users')
      .select('id')
      .eq('email', filterValue)
      .single()

    if (!userRow) return []

    // 2. Obtener los request IDs únicos donde ese usuario actuó
    let historyQuery = sb
      .from('request_history')
      .select('request_id, created_at')
      .eq('user_id', userRow.id)
      .not('request_id', 'is', null)

    if (from) historyQuery = historyQuery.gte('created_at', from)
    if (to)   historyQuery = historyQuery.lte('created_at', to + 'T23:59:59Z')

    const { data: history } = await historyQuery
    if (!history || history.length === 0) return []

    const requestIds = [...new Set((history as any[]).map(h => h.request_id))].slice(0, 200)

    // 3. Obtener el detalle de esas solicitudes
    let reqQuery = sb
      .from('requests')
      .select('radicado, patient_email, patient_data_json, type, status, created_at, updated_at, institution_id, institutions(name)')
      .in('id', requestIds)
      .order('created_at', { ascending: false })

    if (!filter.isSuperAdmin && filter.institutionId) {
      reqQuery = reqQuery.eq('institution_id', filter.institutionId)
    }

    const { data, error } = await reqQuery
    if (error || !data) { console.error('fetchRequestsDetail user error:', error); return [] }

    return (data as any[]).map(r => {
      const json = r.patient_data_json || {}
      const name = json['Nombre Completo'] || json['nombre'] || json['nombre_completo'] || json['fullName'] || '—'
      const isResolved = r.status === 'responded' || r.status === 'closed'
      return {
        radicado: r.radicado || '—',
        patient_name: name,
        patient_email: r.patient_email || '—',
        type: r.type || '—',
        status: r.status,
        created_at: new Date(r.created_at).toLocaleDateString('es-CO'),
        resolved_at: isResolved && r.updated_at ? new Date(r.updated_at).toLocaleDateString('es-CO') : null,
        days_open: calcDays(r.created_at, r.status, r.updated_at),
        institution: r.institutions?.name || '—'
      }
    })
  }

  // ── Filtros por institución o tipo ───────────────────────────────────────────
  let query = sb.from('requests').select('radicado, patient_email, patient_data_json, type, status, created_at, updated_at, institution_id, institutions(name)')

  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59Z')
  if (!filter.isSuperAdmin && filter.institutionId) {
    query = query.eq('institution_id', filter.institutionId)
  }

  if (filterType === 'institution') {
    const { data: inst } = await sb.from('institutions').select('id').eq('name', filterValue).single()
    if (inst) query = query.eq('institution_id', inst.id)
  } else if (filterType === 'type') {
    query = query.eq('type', filterValue)
  }

  query = query.order('created_at', { ascending: false }).limit(200)

  const { data, error } = await query
  if (error || !data) { console.error('fetchRequestsDetail error:', error); return [] }

  return (data as any[]).map(r => {
    const json = r.patient_data_json || {}
    const name = json['Nombre Completo'] || json['nombre'] || json['nombre_completo'] || json['fullName'] || '—'
    const isResolved = r.status === 'responded' || r.status === 'closed'
    return {
      radicado: r.radicado || '—',
      patient_name: name,
      patient_email: r.patient_email || '—',
      type: r.type || '—',
      status: r.status,
      created_at: new Date(r.created_at).toLocaleDateString('es-CO'),
      resolved_at: isResolved && r.updated_at ? new Date(r.updated_at).toLocaleDateString('es-CO') : null,
      days_open: calcDays(r.created_at, r.status, r.updated_at),
      institution: r.institutions?.name || '—'
    }
  })
}


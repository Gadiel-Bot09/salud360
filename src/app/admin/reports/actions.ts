'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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
  const sb = getAdminClient()
  let query = sb
    .from('requests')
    .select('status, institutions(name)')

  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59Z')

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
  const sb = getAdminClient()
  let query = sb.from('requests').select('type, status, created_at, updated_at')
  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59Z')

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
  const sb = getAdminClient()
  let query = sb
    .from('request_history')
    .select('user_id, action, comment, to_status, created_at')
    .not('user_id', 'is', null)

  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59Z')

  const { data: history, error } = await query
  if (error || !history) { console.error(error); return [] }

  const userIds = [...new Set((history as any[]).map(h => h.user_id))]
  const { data: users } = await sb.from('users').select('id, email, role').in('id', userIds)
  const userMap: Record<string, { email: string; role: string }> = {}
  for (const u of (users || []) as any[]) userMap[u.id] = { email: u.email, role: u.role }

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
  const sb = getAdminClient()
  let query = sb.from('requests')
    .select('status, created_at, updated_at, institutions(name)')
    .in('status', ['responded', 'closed'])

  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59Z')

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
  const sb = getAdminClient()
  const defaultFrom = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const defaultTo   = to   || new Date().toISOString().split('T')[0]

  const { data, error } = await sb.from('requests')
    .select('created_at, status')
    .gte('created_at', defaultFrom)
    .lte('created_at', defaultTo + 'T23:59:59Z')

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
  const sb = getAdminClient()
  const cutoff = new Date(Date.now() - minDays * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await sb.from('requests')
    .select('radicado, type, patient_email, status, created_at, institutions(name)')
    .in('status', ['received', 'processing', 'escalated'])
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true })

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

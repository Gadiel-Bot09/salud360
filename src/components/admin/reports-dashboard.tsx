'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  Building2, Tag, Users, Clock, TrendingUp, AlertTriangle,
  Download, FileText, RefreshCw, Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type {
  InstitutionReport, TypeReport, UserActivityReport,
  SLAReport, TrendPoint, PendingCritical
} from '@/app/admin/reports/actions'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReportData {
  byInstitution: InstitutionReport[]
  byType: TypeReport[]
  byUser: UserActivityReport[]
  sla: SLAReport[]
  trend: TrendPoint[]
  criticals: PendingCritical[]
}

type TabId = 'institution' | 'type' | 'user' | 'sla' | 'trend' | 'criticals'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'institution', label: 'Por Entidad',      icon: Building2 },
  { id: 'type',        label: 'Por Especialidad', icon: Tag },
  { id: 'user',        label: 'Por Usuario',      icon: Users },
  { id: 'sla',         label: 'Tiempos SLA',      icon: Clock },
  { id: 'trend',       label: 'Tendencia',        icon: TrendingUp },
  { id: 'criticals',   label: 'Críticos',         icon: AlertTriangle },
]

const STATUS_LABELS: Record<string, string> = {
  received: 'Recibida', processing: 'En Trámite',
  responded: 'Respondida', closed: 'Cerrada', escalated: 'Escalada'
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String((r as any)[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── PDF Export ────────────────────────────────────────────────────────────────
async function exportPDF(title: string, headers: string[], rows: (string | number)[][]) {
  // Dynamic import so it doesn't bloat the initial bundle
  const jsPDFModule = await import('jspdf')
  const jsPDF = jsPDFModule.default
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = autoTableModule.default

  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })

  // Header
  doc.setFillColor(15, 118, 110)
  doc.rect(0, 0, 297, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Salud360 — ' + title, 14, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Generado: ' + new Date().toLocaleString('es-CO'), 220, 14)

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 253, 250] },
    margin: { left: 14, right: 14 }
  })

  doc.save(title.replace(/ /g, '_') + '.pdf')
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'teal' }: { label: string; value: number | string; color?: string }) {
  const colors: Record<string, string> = {
    teal: 'from-teal-500 to-teal-700',
    blue: 'from-blue-500 to-blue-700',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-700',
    emerald: 'from-emerald-500 to-emerald-700',
    indigo: 'from-indigo-500 to-indigo-700',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.teal} rounded-2xl p-5 text-white shadow-lg`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{label}</p>
      <p className="text-4xl font-bold mt-1">{value}</p>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
interface Props {
  initialData: ReportData
  onRefresh: (from: string, to: string) => Promise<ReportData>
}

export function ReportsDashboard({ initialData, onRefresh }: Props) {
  const [data, setData]       = useState<ReportData>(initialData)
  const [activeTab, setTab]   = useState<TabId>('institution')
  const [dateFrom, setFrom]   = useState('')
  const [dateTo, setTo]       = useState('')
  const [isPending, startTransition] = useTransition()

  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      const fresh = await onRefresh(dateFrom, dateTo)
      setData(fresh)
    })
  }, [dateFrom, dateTo, onRefresh])

  // ── Render Tabs ─────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {

      // ── By Institution ──────────────────────────────────────────────────────
      case 'institution': {
        const rows = data.byInstitution
        const totals = rows.reduce((a, r) => ({ total: a.total + r.total, responded: a.responded + r.responded, closed: a.closed + r.closed }), { total: 0, responded: 0, closed: 0 })
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Total Solicitudes"  value={totals.total}     color="teal" />
              <StatCard label="Respondidas"        value={totals.responded} color="emerald" />
              <StatCard label="Cerradas"           value={totals.closed}    color="blue" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="institution" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total"     name="Total"       fill="#0f766e" radius={[4,4,0,0]} />
                    <Bar dataKey="responded" name="Respondidas" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="closed"    name="Cerradas"    fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr>{['Entidad', 'Total', 'Recibidas', 'En Trámite', 'Respondidas', 'Cerradas', 'Escaladas'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">{r.institution}</td>
                        <td className="px-4 py-3 font-bold text-teal-700">{r.total}</td>
                        <td className="px-4 py-3 text-blue-600">{r.received}</td>
                        <td className="px-4 py-3 text-amber-600">{r.processing}</td>
                        <td className="px-4 py-3 text-emerald-600">{r.responded}</td>
                        <td className="px-4 py-3 text-green-600">{r.closed}</td>
                        <td className="px-4 py-3 text-red-600">{r.escalated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex gap-3">
              <Button size="sm" variant="outline" onClick={() => exportCSV('reporte_entidades.csv', rows as any)}>
                <Download className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
              <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={() => exportPDF('Solicitudes por Entidad', ['Entidad','Total','Recibidas','En Trámite','Respondidas','Cerradas','Escaladas'], rows.map(r => [r.institution, r.total, r.received, r.processing, r.responded, r.closed, r.escalated]))}>
                <FileText className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>
        )
      }

      // ── By Type ─────────────────────────────────────────────────────────────
      case 'type': {
        const rows = data.byType
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, left: 100, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={95} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total"     name="Total"       fill="#0f766e" radius={[0,4,4,0]} />
                    <Bar dataKey="responded" name="Respondidas" fill="#10b981" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr>{['Tipo/Especialidad','Total','Respondidas','Prom. Días Respuesta'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{r.type}</td>
                        <td className="px-4 py-3 font-bold text-teal-700">{r.total}</td>
                        <td className="px-4 py-3 text-emerald-600">{r.responded}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.avg_days <= 3 ? 'bg-green-100 text-green-700' : r.avg_days <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {r.avg_days} días
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex gap-3">
              <Button size="sm" variant="outline" onClick={() => exportCSV('reporte_especialidades.csv', rows as any)}>
                <Download className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
              <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={() => exportPDF('Solicitudes por Especialidad', ['Tipo','Total','Respondidas','Prom. Días'], rows.map(r => [r.type, r.total, r.responded, r.avg_days]))}>
                <FileText className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>
        )
      }

      // ── By User ─────────────────────────────────────────────────────────────
      case 'user': {
        const rows = data.byUser
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows.slice(0, 10)} margin={{ top: 16, right: 24, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="user_email" tick={{ fontSize: 10, angle: -30, textAnchor: 'end' }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="actions"   name="Acciones"    fill="#6366f1" radius={[4,4,0,0]} />
                    <Bar dataKey="responded" name="Respondidas" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr>{['Usuario','Rol','Acciones Totales','Solicitudes Respondidas','Comentarios'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800 truncate max-w-xs">{r.user_email}</td>
                        <td className="px-4 py-3"><span className="bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-xs font-semibold">{r.role}</span></td>
                        <td className="px-4 py-3 font-bold text-teal-700">{r.actions}</td>
                        <td className="px-4 py-3 text-emerald-600">{r.responded}</td>
                        <td className="px-4 py-3 text-slate-500">{r.comments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex gap-3">
              <Button size="sm" variant="outline" onClick={() => exportCSV('reporte_usuarios.csv', rows as any)}>
                <Download className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
              <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={() => exportPDF('Actividad por Usuario', ['Usuario','Rol','Acciones','Respondidas','Comentarios'], rows.map(r => [r.user_email, r.role, r.actions, r.responded, r.comments]))}>
                <FileText className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>
        )
      }

      // ── SLA ─────────────────────────────────────────────────────────────────
      case 'sla': {
        const rows = data.sla
        const overallAvg = rows.length ? Math.round(rows.reduce((a, r) => a + r.avg_response_days, 0) / rows.length * 10) / 10 : 0
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Promedio Global (días)" value={overallAvg}     color="teal" />
              <StatCard label="Entidades Evaluadas"     value={rows.length}   color="indigo" />
              <StatCard label="Todas En Rango (≤5d)"   value={rows.filter(r => r.avg_response_days <= 5).length} color="emerald" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr>{['Institución','Total Resueltas','Prom. Días','Máx. Días','Cumplieron SLA (≤5d)','% Cumplimiento'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r, i) => {
                      const pct = r.total > 0 ? Math.round(r.on_time / r.total * 100) : 0
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{r.institution}</td>
                          <td className="px-4 py-3 text-teal-700 font-bold">{r.total}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.avg_response_days <= 3 ? 'bg-green-100 text-green-700' : r.avg_response_days <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {r.avg_response_days}d
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{r.max_days}d</td>
                          <td className="px-4 py-3 text-emerald-600 font-semibold">{r.on_time}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 rounded-full h-2 min-w-[60px]">
                                <div className={`h-2 rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-bold text-slate-600">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex gap-3">
              <Button size="sm" variant="outline" onClick={() => exportCSV('reporte_sla.csv', rows.map(r => ({ ...r, cumplimiento_pct: r.total > 0 ? Math.round(r.on_time / r.total * 100) : 0 })) as any)}>
                <Download className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
              <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={() => exportPDF('Tiempos SLA', ['Institución','Total','Prom. Días','Máx. Días','SLA OK','%'], rows.map(r => [r.institution, r.total, r.avg_response_days, r.max_days, r.on_time, r.total > 0 ? Math.round(r.on_time / r.total * 100) + '%' : '0%']))}>
                <FileText className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>
        )
      }

      // ── Trend ───────────────────────────────────────────────────────────────
      case 'trend': {
        const rows = data.trend
        const totalPeriod = rows.reduce((a, r) => a + r.total, 0)
        const totalResponded = rows.reduce((a, r) => a + r.responded, 0)
        const peak = rows.reduce((a, r) => r.total > a.total ? r : a, rows[0] || { date: '—', total: 0, responded: 0 })
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Total en Período"   value={totalPeriod}    color="teal" />
              <StatCard label="Respondidas"        value={totalResponded} color="emerald" />
              <StatCard label="Día Pico"           value={peak.date + ' (' + peak.total + ')'} color="indigo" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={l => 'Fecha: ' + l} />
                    <Legend />
                    <Line type="monotone" dataKey="total"     name="Total"       stroke="#0f766e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="responded" name="Respondidas" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex gap-3">
              <Button size="sm" variant="outline" onClick={() => exportCSV('reporte_tendencia.csv', rows as any)}>
                <Download className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
              <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={() => exportPDF('Tendencia de Radicación', ['Fecha','Total','Respondidas'], rows.map(r => [r.date, r.total, r.responded]))}>
                <FileText className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>
        )
      }

      // ── Criticals ───────────────────────────────────────────────────────────
      case 'criticals': {
        const rows = data.criticals
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Total Pendientes Críticos" value={rows.length} color="red" />
              <StatCard label="Más de 10 días"            value={rows.filter(r => r.days_open > 10).length} color="red" />
              <StatCard label="Escalados"                 value={rows.filter(r => r.status === 'escalated').length} color="amber" />
            </div>
            {rows.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 text-center">
                <p className="text-emerald-700 font-semibold text-lg">✅ ¡Sin pendientes críticos!</p>
                <p className="text-emerald-600 text-sm mt-1">Todas las solicitudes están siendo atendidas oportunamente.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-rose-200 overflow-hidden shadow-sm">
                <div className="bg-rose-50 px-6 py-3 border-b border-rose-200">
                  <p className="text-xs text-rose-700 font-semibold">⚠️ Solicitudes con más de 5 días sin respuesta</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>{['Radicado','Tipo','Institución','Correo Paciente','Estado','Días Abierto'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((r, i) => (
                        <tr key={i} className="hover:bg-rose-50/50">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-teal-700">{r.radicado}</td>
                          <td className="px-4 py-3 text-slate-700">{r.type}</td>
                          <td className="px-4 py-3 text-slate-700">{r.institution}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[180px]">{r.patient_email}</td>
                          <td className="px-4 py-3"><span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-xs font-semibold">{STATUS_LABELS[r.status] || r.status}</span></td>
                          <td className="px-4 py-3">
                            <span className={`font-bold text-sm ${r.days_open > 10 ? 'text-red-600' : 'text-amber-600'}`}>
                              {r.days_open}d
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button size="sm" variant="outline" onClick={() => exportCSV('pendientes_criticos.csv', rows as any)}>
                <Download className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => exportPDF('Pendientes Críticos', ['Radicado','Tipo','Institución','Email','Estado','Días'], rows.map(r => [r.radicado, r.type, r.institution, r.patient_email, STATUS_LABELS[r.status] || r.status, r.days_open]))}>
                <FileText className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>
        )
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 mb-2" />
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-500 uppercase">Desde</Label>
            <Input type="date" value={dateFrom} onChange={e => setFrom(e.target.value)} className="h-9 text-sm w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-500 uppercase">Hasta</Label>
            <Input type="date" value={dateTo} onChange={e => setTo(e.target.value)} className="h-9 text-sm w-40" />
          </div>
          <Button onClick={handleRefresh} disabled={isPending} className="bg-teal-700 hover:bg-teal-800 h-9">
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-teal-700 text-white shadow-lg shadow-teal-600/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-teal-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'criticals' && data.criticals.length > 0 && (
                <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold ${isActive ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'}`}>
                  {data.criticals.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {renderContent()}
      </div>
    </div>
  )
}

import {
  fetchRequestsByInstitution,
  fetchRequestsByType,
  fetchActivityByUser,
  fetchSLAReport,
  fetchTrendData,
  fetchPendingCriticals,
  fetchAttendanceReport,
  fetchAttendanceDetail,
  fetchRequestsDetail,
  fetchDailyRequestsReport,
  fetchChannelSummary,
  fetchTypeChannelReport,
  fetchReceivedRequestsReport,
} from './actions'
import { fetchCircular1552Report } from './circular1552-actions'
import { ReportsDashboard } from '@/components/admin/reports-dashboard'
import { Circular1552Table } from '@/components/admin/circular1552-table'
import { DailyRequestsReport } from '@/components/admin/daily-requests-report'
import { ReceivedRequestsReport } from '@/components/admin/received-requests-report'
import { BarChart2, FileText, CalendarDays, Inbox } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function loadAllReports(from?: string, to?: string) {
  const [byInstitution, byType, byUser, sla, trend, criticals, attendance] = await Promise.all([
    fetchRequestsByInstitution(from, to),
    fetchRequestsByType(from, to),
    fetchActivityByUser(from, to),
    fetchSLAReport(from, to),
    fetchTrendData(from, to),
    fetchPendingCriticals(5),
    fetchAttendanceReport(from, to)
  ])
  return { byInstitution, byType, byUser, sla, trend, criticals, attendance }
}

export default async function ReportsPage() {
  // Circular 1552 NO se precarga — el gestor debe presionar "Generar Reporte"
  // para evitar consumo innecesario de BD al entrar al módulo.
  const initialData = await loadAllReports()

  // Daily report & Solicitudes Recibidas (precarga)
  const [initialDaily, initialChannels, initialTypes, initialReceived] = await Promise.all([
    fetchDailyRequestsReport(),
    fetchChannelSummary(),
    fetchTypeChannelReport(),
    fetchReceivedRequestsReport(),
  ])

  async function refresh(from: string, to: string) {
    'use server'
    return loadAllReports(from || undefined, to || undefined)
  }

  async function fetchDetail(filterType: 'institution' | 'type' | 'user', filterValue: string, from: string, to: string) {
    'use server'
    return fetchRequestsDetail(filterType, filterValue, from || undefined, to || undefined)
  }

  async function fetchAttDetail(institutionName: string, from: string, to: string) {
    'use server'
    return fetchAttendanceDetail(institutionName, from || undefined, to || undefined)
  }

  async function fetchCircular(from: string, to: string) {
    'use server'
    return fetchCircular1552Report(from || undefined, to || undefined)
  }

  async function refreshDaily(from: string, to: string) {
    'use server'
    const [daily, channels, types] = await Promise.all([
      fetchDailyRequestsReport(from || undefined, to || undefined),
      fetchChannelSummary(from || undefined, to || undefined),
      fetchTypeChannelReport(from || undefined, to || undefined),
    ])
    return { daily, channels, types }
  }

  async function refreshReceived(from: string, to: string) {
    'use server'
    return fetchReceivedRequestsReport(from || undefined, to || undefined)
  }

  const criticalsCount = initialReceived.filter(r => r.is_critical).length

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-600/30">
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Centro de Reportes</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Analítica avanzada · Solicitudes Recibidas y Críticas · Exportación a Excel, CSV y PDF
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-4 py-2 rounded-full">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Datos en tiempo real
        </div>
      </div>

      {/* Quick Navigation Anchor Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-xs font-semibold text-slate-600">
        <a
          href="#dashboard-analitico"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-800 shadow-xs hover:text-teal-700 hover:shadow-sm transition"
        >
          <BarChart2 className="w-3.5 h-3.5 text-teal-600" />
          <span>Analítica y SLA</span>
        </a>
        <a
          href="#reporte-recibidas"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-800 shadow-xs hover:text-teal-700 hover:shadow-sm transition"
        >
          <Inbox className="w-3.5 h-3.5 text-blue-600" />
          <span>Solicitudes Recibidas y Críticas</span>
          {criticalsCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
              {criticalsCount} críticas
            </span>
          )}
        </a>
        <a
          href="#informe-diario"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-800 shadow-xs hover:text-teal-700 hover:shadow-sm transition"
        >
          <CalendarDays className="w-3.5 h-3.5 text-teal-600" />
          <span>Informe Diario por Canal</span>
        </a>
        <a
          href="#circular-1552"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-800 shadow-xs hover:text-teal-700 hover:shadow-sm transition"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          <span>Circular 1552</span>
        </a>
      </div>

      {/* Analytics Dashboard (existing) */}
      <section id="dashboard-analitico" className="scroll-mt-6">
        <ReportsDashboard
          initialData={initialData}
          onRefresh={refresh}
          onFetchDetail={fetchDetail}
          onFetchAttDetail={fetchAttDetail}
        />
      </section>

      {/* ── Reporte de Solicitudes Recibidas y Críticas ─────────────────────── */}
      <section id="reporte-recibidas" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-teal-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-700 rounded-xl flex items-center justify-center shadow-sm text-white">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800 text-lg">Reporte de Solicitudes Recibidas y Críticas</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Nuevo
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Monitoreo de solicitudes en estado Recibida · Alertas de criticidad (+5 días) · Desglose por servicio y datos del paciente
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <ReceivedRequestsReport
            initialData={initialReceived}
            onRefresh={refreshReceived}
          />
        </div>
      </section>

      {/* ── Informe Diario por Canal y Tipo ──────────────────────────────────── */}
      <section id="informe-diario" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-6">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-sm">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Informe Diario de Solicitudes</h2>
            <p className="text-xs text-slate-500">
              Desglose por canal (Online · Presencial) y tipo de solicitud · Exportación CSV
            </p>
          </div>
        </div>
        <div className="p-6">
          <DailyRequestsReport
            initialDaily={initialDaily}
            initialChannels={initialChannels}
            initialTypes={initialTypes}
            onRefresh={refreshDaily}
          />
        </div>
      </section>

      {/* ── Reporte Circular 1552 ─────────────────────────────────────────── */}
      <section id="circular-1552" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-6">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Reporte Circular 1552</h2>
            <p className="text-xs text-slate-500">
              Resolución 1552/2013 · Oportunidad en asignación de citas · Exportación CSV para Supersalud
            </p>
          </div>
        </div>
        <div className="p-6">
          <Circular1552Table initialData={[]} onFetch={fetchCircular} />
        </div>
      </section>
    </div>
  )
}

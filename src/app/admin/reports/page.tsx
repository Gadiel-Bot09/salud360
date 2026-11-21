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
  fetchReportsHubSummary,
} from './actions'
import { fetchCircular1552Report } from './circular1552-actions'
import { ReportsHub, type ReportModuleId, type AnalyticsBundle, type DailyBundle } from '@/components/admin/reports-hub'
import { BarChart2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

const VALID_REPORTS: ReportModuleId[] = ['analytics', 'received', 'daily', 'circular1552']

async function loadAnalyticsBundle(from?: string, to?: string): Promise<AnalyticsBundle> {
  const [byInstitution, byType, byUser, sla, trend, criticals, attendance] = await Promise.all([
    fetchRequestsByInstitution(from, to),
    fetchRequestsByType(from, to),
    fetchActivityByUser(from, to),
    fetchSLAReport(from, to),
    fetchTrendData(from, to),
    fetchPendingCriticals(5),
    fetchAttendanceReport(from, to),
  ])
  return { byInstitution, byType, byUser, sla, trend, criticals, attendance }
}

async function loadDailyBundle(from?: string, to?: string): Promise<DailyBundle> {
  const [daily, channels, types] = await Promise.all([
    fetchDailyRequestsReport(from, to),
    fetchChannelSummary(from, to),
    fetchTypeChannelReport(from, to),
  ])
  return { daily, channels, types }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { report?: string }
}) {
  const requested = searchParams?.report as ReportModuleId | undefined
  const activeReport: ReportModuleId = requested && VALID_REPORTS.includes(requested)
    ? requested
    : 'analytics'

  // Carga inteligente en servidor:
  // Solo se consulta el resumen ligero de badges + el reporte activo seleccionado.
  // Los demás reportes se cargan bajo demanda al seleccionarlos en el hub.
  const [summary, initialAnalytics, initialReceived, initialDaily] = await Promise.all([
    fetchReportsHubSummary(),
    activeReport === 'analytics' ? loadAnalyticsBundle() : Promise.resolve(null),
    activeReport === 'received'  ? fetchReceivedRequestsReport() : Promise.resolve(null),
    activeReport === 'daily'     ? loadDailyBundle() : Promise.resolve(null),
  ])

  async function onLoadAnalytics(from: string, to: string) {
    'use server'
    return loadAnalyticsBundle(from || undefined, to || undefined)
  }

  async function onFetchDetail(
    filterType: 'institution' | 'type' | 'user',
    filterValue: string,
    from: string,
    to: string
  ) {
    'use server'
    return fetchRequestsDetail(filterType, filterValue, from || undefined, to || undefined)
  }

  async function onFetchAttDetail(institutionName: string, from: string, to: string) {
    'use server'
    return fetchAttendanceDetail(institutionName, from || undefined, to || undefined)
  }

  async function onLoadReceived(from: string, to: string) {
    'use server'
    return fetchReceivedRequestsReport(from || undefined, to || undefined)
  }

  async function onLoadDaily(from: string, to: string) {
    'use server'
    return loadDailyBundle(from || undefined, to || undefined)
  }

  async function onFetchCircular(from: string, to: string) {
    'use server'
    return fetchCircular1552Report(from || undefined, to || undefined)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-600/30">
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Centro de Reportes</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Plataforma modular de analítica, seguimiento operativo y reportes normativos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-4 py-2 rounded-full">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Datos en tiempo real
        </div>
      </div>

      {/* Modular Reports Hub (1 reporte activo a la vez + carga bajo demanda) */}
      <ReportsHub
        initialReport={activeReport}
        summary={summary}
        initialAnalytics={initialAnalytics}
        initialReceived={initialReceived}
        initialDaily={initialDaily}
        onLoadAnalytics={onLoadAnalytics}
        onFetchDetail={onFetchDetail}
        onFetchAttDetail={onFetchAttDetail}
        onLoadReceived={onLoadReceived}
        onLoadDaily={onLoadDaily}
        onFetchCircular={onFetchCircular}
      />
    </div>
  )
}

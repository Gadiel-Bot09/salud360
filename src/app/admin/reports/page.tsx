import {
  fetchRequestsByInstitution,
  fetchRequestsByType,
  fetchActivityByUser,
  fetchSLAReport,
  fetchTrendData,
  fetchPendingCriticals,
  fetchAttendanceReport,
  fetchAttendanceDetail,
  fetchRequestsDetail
} from './actions'
import { fetchCircular1552Report } from './circular1552-actions'
import { ReportsDashboard } from '@/components/admin/reports-dashboard'
import { Circular1552Table } from '@/components/admin/circular1552-table'
import { BarChart2, FileText } from 'lucide-react'

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
              Analítica avanzada · Exportación a CSV y PDF · Drill-down por fila
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-4 py-2 rounded-full">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Datos en tiempo real
        </div>
      </div>

      {/* Analytics Dashboard (existing) */}
      <ReportsDashboard
        initialData={initialData}
        onRefresh={refresh}
        onFetchDetail={fetchDetail}
        onFetchAttDetail={fetchAttDetail}
      />

      {/* ── Reporte Circular 1552 ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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

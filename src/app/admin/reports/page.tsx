import {
  fetchRequestsByInstitution,
  fetchRequestsByType,
  fetchActivityByUser,
  fetchSLAReport,
  fetchTrendData,
  fetchPendingCriticals
} from './actions'
import { ReportsDashboard } from '@/components/admin/reports-dashboard'
import { BarChart2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function loadAllReports(from?: string, to?: string) {
  const [byInstitution, byType, byUser, sla, trend, criticals] = await Promise.all([
    fetchRequestsByInstitution(from, to),
    fetchRequestsByType(from, to),
    fetchActivityByUser(from, to),
    fetchSLAReport(from, to),
    fetchTrendData(from, to),
    fetchPendingCriticals(5)
  ])
  return { byInstitution, byType, byUser, sla, trend, criticals }
}

export default async function ReportsPage() {
  const initialData = await loadAllReports()

  async function refresh(from: string, to: string) {
    'use server'
    return loadAllReports(from || undefined, to || undefined)
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
              Analítica avanzada · Exportación a CSV y PDF
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-4 py-2 rounded-full">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Datos en tiempo real
        </div>
      </div>

      <ReportsDashboard initialData={initialData} onRefresh={refresh} />
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import {
  BarChart2,
  Inbox,
  CalendarDays,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { ReportsDashboard } from '@/components/admin/reports-dashboard'
import { ReceivedRequestsReport } from '@/components/admin/received-requests-report'
import { DailyRequestsReport } from '@/components/admin/daily-requests-report'
import { Circular1552Table } from '@/components/admin/circular1552-table'
import type {
  InstitutionReport,
  TypeReport,
  UserActivityReport,
  SLAReport,
  TrendPoint,
  PendingCritical,
  AttendanceReportRow,
  RequestDetailRow,
  AttendanceDetailRow,
  DailyRow,
  ChannelSummary,
  TypeChannelRow,
  ReceivedRequestReportRow,
  ReportsHubSummary,
} from '@/app/admin/reports/actions'
import type { Circular1552Row } from '@/app/admin/reports/circular1552-actions'

export type ReportModuleId = 'analytics' | 'received' | 'daily' | 'circular1552'

export interface AnalyticsBundle {
  byInstitution: InstitutionReport[]
  byType: TypeReport[]
  byUser: UserActivityReport[]
  sla: SLAReport[]
  trend: TrendPoint[]
  criticals: PendingCritical[]
  attendance: AttendanceReportRow[]
}

export interface DailyBundle {
  daily: DailyRow[]
  channels: ChannelSummary[]
  types: TypeChannelRow[]
}

interface Props {
  initialReport: ReportModuleId
  summary: ReportsHubSummary
  initialAnalytics: AnalyticsBundle | null
  initialReceived: ReceivedRequestReportRow[] | null
  initialDaily: DailyBundle | null
  // Server Actions
  onLoadAnalytics: (from: string, to: string) => Promise<AnalyticsBundle>
  onFetchDetail: (filterType: 'institution' | 'type' | 'user', filterValue: string, from: string, to: string) => Promise<RequestDetailRow[]>
  onFetchAttDetail: (institutionName: string, from: string, to: string) => Promise<AttendanceDetailRow[]>
  onLoadReceived: (from: string, to: string) => Promise<ReceivedRequestReportRow[]>
  onLoadDaily: (from: string, to: string) => Promise<DailyBundle>
  onFetchCircular: (from: string, to: string) => Promise<Circular1552Row[]>
}

interface ReportCardMeta {
  id: ReportModuleId
  title: string
  shortTitle: string
  description: string
  icon: React.ElementType
  accentBg: string
  accentIcon: string
  activeBorder: string
  activeBg: string
  tag: string
}

const REPORT_CATALOG: ReportCardMeta[] = [
  {
    id: 'analytics',
    title: 'Analítica General y SLA',
    shortTitle: 'Analítica y SLA',
    description: 'Entidades, especialidades, gestión por usuario, tiempos SLA, tendencia y asistencia.',
    icon: BarChart2,
    accentBg: 'bg-teal-600',
    accentIcon: 'text-white',
    activeBorder: 'border-teal-600 ring-2 ring-teal-500/25',
    activeBg: 'bg-gradient-to-br from-teal-50/90 via-white to-white',
    tag: '7 vistas · Drill-down',
  },
  {
    id: 'received',
    title: 'Solicitudes Recibidas y Críticas',
    shortTitle: 'Recibidas y Críticas',
    description: 'Solicitudes pendientes en estado recibida, servicio solicitado, paciente y alertas +5d.',
    icon: Inbox,
    accentBg: 'bg-gradient-to-br from-blue-600 to-teal-700',
    accentIcon: 'text-white',
    activeBorder: 'border-blue-600 ring-2 ring-blue-500/25',
    activeBg: 'bg-gradient-to-br from-blue-50/90 via-white to-white',
    tag: 'Excel · CSV · PDF',
  },
  {
    id: 'daily',
    title: 'Informe Diario por Canal',
    shortTitle: 'Informe Diario',
    description: 'Evolución diaria de radicación Online vs. Presencial y desglose por tipo de trámite.',
    icon: CalendarDays,
    accentBg: 'bg-orange-500',
    accentIcon: 'text-white',
    activeBorder: 'border-orange-500 ring-2 ring-orange-500/25',
    activeBg: 'bg-gradient-to-br from-orange-50/90 via-white to-white',
    tag: 'Online · Presencial',
  },
  {
    id: 'circular1552',
    title: 'Reporte Circular 1552',
    shortTitle: 'Circular 1552',
    description: 'Resolución 1552/2013 · Oportunidad en asignación de citas · Exportación Supersalud.',
    icon: FileText,
    accentBg: 'bg-indigo-600',
    accentIcon: 'text-white',
    activeBorder: 'border-indigo-600 ring-2 ring-indigo-500/25',
    activeBg: 'bg-gradient-to-br from-indigo-50/90 via-white to-white',
    tag: 'Normativo Supersalud',
  },
]

export function ReportsHub({
  initialReport,
  summary: initialSummary,
  initialAnalytics,
  initialReceived,
  initialDaily,
  onLoadAnalytics,
  onFetchDetail,
  onFetchAttDetail,
  onLoadReceived,
  onLoadDaily,
  onFetchCircular,
}: Props) {
  const [activeReport, setActiveReport] = useState<ReportModuleId>(initialReport)
  const [loadingModule, setLoadingModule] = useState<ReportModuleId | null>(null)
  const [summary, setSummary] = useState<ReportsHubSummary>(initialSummary)

  // Client-side cache per report module (avoids redundant DB queries when switching tabs)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsBundle | null>(initialAnalytics)
  const [receivedData, setReceivedData] = useState<ReceivedRequestReportRow[] | null>(initialReceived)
  const [dailyData, setDailyData] = useState<DailyBundle | null>(initialDaily)

  const syncUrlParam = (reportId: ReportModuleId) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('report', reportId)
    window.history.replaceState({}, '', url.toString())
  }

  const handleSelectReport = useCallback(async (reportId: ReportModuleId) => {
    setActiveReport(reportId)
    syncUrlParam(reportId)

    // Lazy-load data only if not yet cached in memory
    if (reportId === 'analytics' && !analyticsData) {
      setLoadingModule('analytics')
      try {
        const res = await onLoadAnalytics('', '')
        setAnalyticsData(res)
      } finally {
        setLoadingModule(null)
      }
    } else if (reportId === 'received' && !receivedData) {
      setLoadingModule('received')
      try {
        const res = await onLoadReceived('', '')
        setReceivedData(res)
        setSummary({
          receivedTotal: res.length,
          receivedCritical: res.filter(r => r.is_critical).length,
        })
      } finally {
        setLoadingModule(null)
      }
    } else if (reportId === 'daily' && !dailyData) {
      setLoadingModule('daily')
      try {
        const res = await onLoadDaily('', '')
        setDailyData(res)
      } finally {
        setLoadingModule(null)
      }
    }
  }, [analyticsData, receivedData, dailyData, onLoadAnalytics, onLoadReceived, onLoadDaily])

  // Keep caches & summary synchronized when user refreshes inside a report
  const handleRefreshAnalytics = useCallback(async (from: string, to: string) => {
    const res = await onLoadAnalytics(from, to)
    setAnalyticsData(res)
    return res
  }, [onLoadAnalytics])

  const handleRefreshReceived = useCallback(async (from: string, to: string) => {
    const res = await onLoadReceived(from, to)
    setReceivedData(res)
    if (!from && !to) {
      setSummary({
        receivedTotal: res.length,
        receivedCritical: res.filter(r => r.is_critical).length,
      })
    }
    return res
  }, [onLoadReceived])

  const handleRefreshDaily = useCallback(async (from: string, to: string) => {
    const res = await onLoadDaily(from, to)
    setDailyData(res)
    return res
  }, [onLoadDaily])

  const activeMeta = REPORT_CATALOG.find(r => r.id === activeReport) || REPORT_CATALOG[0]
  const ActiveIcon = activeMeta.icon

  return (
    <div className="space-y-6">
      {/* ── Selector Modular de Reportes ────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Selecciona el reporte que deseas consultar
          </p>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Carga inteligente bajo demanda · Solo se consulta el reporte activo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {REPORT_CATALOG.map(card => {
            const Icon = card.icon
            const isActive = activeReport === card.id
            const isLoading = loadingModule === card.id

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleSelectReport(card.id)}
                className={`group relative text-left rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between gap-3 ${
                  isActive
                    ? `${card.activeBorder} ${card.activeBg} shadow-md`
                    : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-10 h-10 rounded-xl ${card.accentBg} ${card.accentIcon} flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-105`}>
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Contextual Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {card.id === 'received' && summary.receivedCritical > 0 && (
                      <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {summary.receivedCritical} críticas
                      </span>
                    )}
                    {card.id === 'received' && summary.receivedTotal > 0 && summary.receivedCritical === 0 && (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {summary.receivedTotal} en bandeja
                      </span>
                    )}
                    {isActive && (
                      <span className="inline-flex items-center gap-1 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Activo
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className={`font-bold text-sm leading-snug ${isActive ? 'text-slate-900' : 'text-slate-800 group-hover:text-teal-800'}`}>
                    {card.title}
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <span className="font-medium text-slate-400">{card.tag}</span>
                  <span className={`font-bold transition-colors ${isActive ? 'text-teal-700' : 'text-slate-400 group-hover:text-teal-600'}`}>
                    {isActive ? 'Visualizando' : 'Abrir →'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Contenedor del Reporte Activo (Solo 1 reporte montado a la vez) ─── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
        {/* Cabecera del Reporte Seleccionado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-teal-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${activeMeta.accentBg} ${activeMeta.accentIcon} flex items-center justify-center shadow-sm shrink-0`}>
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg leading-tight">{activeMeta.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{activeMeta.description}</p>
            </div>
          </div>

          {activeReport === 'received' && summary.receivedTotal > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                {summary.receivedTotal} recibidas
              </span>
              {summary.receivedCritical > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                  {summary.receivedCritical} críticas (+5d)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Cuerpo del Reporte */}
        <div className="p-6">
          {loadingModule === activeReport ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
              </div>
              <p className="font-semibold text-slate-700 text-sm">Cargando {activeMeta.title}...</p>
              <p className="text-xs text-slate-400">Consultando datos en tiempo real de tu institución</p>
            </div>
          ) : (
            <>
              {activeReport === 'analytics' && analyticsData && (
                <ReportsDashboard
                  initialData={analyticsData}
                  onRefresh={handleRefreshAnalytics}
                  onFetchDetail={onFetchDetail}
                  onFetchAttDetail={onFetchAttDetail}
                />
              )}

              {activeReport === 'received' && receivedData && (
                <ReceivedRequestsReport
                  initialData={receivedData}
                  onRefresh={handleRefreshReceived}
                />
              )}

              {activeReport === 'daily' && dailyData && (
                <DailyRequestsReport
                  initialDaily={dailyData.daily}
                  initialChannels={dailyData.channels}
                  initialTypes={dailyData.types}
                  onRefresh={handleRefreshDaily}
                />
              )}

              {activeReport === 'circular1552' && (
                <Circular1552Table
                  initialData={[]}
                  onFetch={onFetchCircular}
                />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import {
  Inbox, AlertTriangle, Clock, CheckCircle2, Search, X,
  Download, FileText, RefreshCw, Loader2, ExternalLink,
  Phone, Mail, Building, Globe, Flame, Stethoscope, ChevronLeft,
  ChevronRight, ChevronsLeft, ChevronsRight, FileSpreadsheet, ShieldAlert
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ReceivedRequestReportRow } from '@/app/admin/reports/actions'

interface Props {
  initialData: ReceivedRequestReportRow[]
  onRefresh: (from: string, to: string) => Promise<ReceivedRequestReportRow[]>
}

type CriticidadFilter = 'all' | 'critical' | 'urgent' | 'ontime' | 'escalated'

const SERVICE_COLORS: Record<string, string> = {
  'Cirugía Oral':          'bg-purple-100 text-purple-800 border-purple-200',
  'Cirugía Maxilofacial':  'bg-pink-100 text-pink-800 border-pink-200',
  'Endodoncia':            'bg-rose-100 text-rose-800 border-rose-200',
  'Rehabilitación':        'bg-orange-100 text-orange-800 border-orange-200',
  'Odontopediatría':       'bg-amber-100 text-amber-900 border-amber-200',
  'Ortodoncia':            'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Periodoncia':           'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Primera Vez':           'bg-teal-100 text-teal-800 border-teal-200',
  'Prótesis':              'bg-blue-100 text-blue-800 border-blue-200',
  'Anestesia':             'bg-slate-100 text-slate-800 border-slate-200',
}

function getServiceColor(servicio: string) {
  for (const [key, color] of Object.entries(SERVICE_COLORS)) {
    if (servicio.toLowerCase().includes(key.toLowerCase())) return color
  }
  return 'bg-teal-50 text-teal-800 border-teal-200'
}

export function ReceivedRequestsReport({ initialData, onRefresh }: Props) {
  const [data, setData] = useState<ReceivedRequestReportRow[]>(initialData)
  const [search, setSearch] = useState('')
  const [criticidadFilter, setCriticidadFilter] = useState<CriticidadFilter>('all')
  const [selectedService, setSelectedService] = useState<string>('ALL')
  const [selectedCanal, setSelectedCanal] = useState<string>('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [isPending, startTransition] = useTransition()

  // Lista dinámica de servicios presentes en los datos
  const serviceOptions = useMemo(() => {
    const set = new Set<string>()
    data.forEach(r => {
      if (r.servicio && r.servicio !== '—') set.add(r.servicio)
    })
    return Array.from(set).sort()
  }, [data])

  // Métricas agregadas
  const stats = useMemo(() => {
    const total = data.length
    const critical = data.filter(r => r.days_open >= 5 || r.status === 'escalated').length
    const urgent = data.filter(r => r.days_open >= 10).length
    const ontime = data.filter(r => r.days_open < 5 && r.status !== 'escalated').length
    const escalated = data.filter(r => r.status === 'escalated').length

    // Top 4 servicios
    const serviceMap: Record<string, number> = {}
    data.forEach(r => {
      const s = r.servicio || 'General'
      serviceMap[s] = (serviceMap[s] || 0) + 1
    })
    const topServices = Object.entries(serviceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)

    return { total, critical, urgent, ontime, escalated, topServices }
  }, [data])

  // Filtrado reactivo
  const filtered = useMemo(() => {
    return data.filter(r => {
      // Búsqueda por texto
      if (search.trim()) {
        const q = search.toLowerCase()
        const matches =
          r.radicado.toLowerCase().includes(q) ||
          r.patient_name.toLowerCase().includes(q) ||
          r.patient_document_number.toLowerCase().includes(q) ||
          r.servicio.toLowerCase().includes(q) ||
          r.patient_phone.toLowerCase().includes(q) ||
          r.patient_email.toLowerCase().includes(q) ||
          r.institution.toLowerCase().includes(q) ||
          r.patient_eps.toLowerCase().includes(q)
        if (!matches) return false
      }

      // Filtro de Criticidad
      if (criticidadFilter === 'critical' && (!r.is_critical || r.days_open < 5)) return false
      if (criticidadFilter === 'urgent' && !r.is_highly_critical) return false
      if (criticidadFilter === 'ontime' && (r.days_open >= 5 || r.status === 'escalated')) return false
      if (criticidadFilter === 'escalated' && r.status !== 'escalated') return false

      // Filtro de Servicio
      if (selectedService !== 'ALL' && r.servicio !== selectedService) return false

      // Filtro de Canal
      if (selectedCanal !== 'ALL' && r.canal !== selectedCanal) return false

      return true
    })
  }, [data, search, criticidadFilter, selectedService, selectedCanal])

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  // Refrescar datos por rango de fecha
  const handleRefresh = () => {
    startTransition(async () => {
      const result = await onRefresh(from, to)
      setData(result)
      setPage(1)
    })
  }

  // ── Exportación a Excel (.xlsx) ──────────────────────────────────────────────
  const handleExportExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = filtered.map(r => ({
      'Radicado': r.radicado,
      'Fecha Radicación': r.created_at_formatted,
      'Días Abierta': r.days_open,
      'Nivel Criticidad':
        r.days_open >= 10 ? 'Alta Criticidad (+10d)' :
        r.days_open >= 5 ? 'Crítica (+5d)' :
        r.days_open >= 3 ? 'Por Vencer (3-4d)' : 'En Tiempo (<3d)',
      'Estado': r.status_label,
      'Servicio Solicitado': r.servicio,
      'Detalle Solicitud': r.request_detail || '—',
      'Paciente': r.patient_name,
      'Tipo Documento': r.patient_document_type,
      'Número Documento': r.patient_document_number,
      'Teléfono': r.patient_phone,
      'Correo Electrónico': r.patient_email,
      'EPS / Entidad': r.patient_eps,
      'Canal': r.canal === 'presencial' ? 'Presencial' : 'Online (Portal)',
      'Institución': r.institution
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    // Ancho sugerido de columnas
    ws['!cols'] = [
      { wch: 22 }, // Radicado
      { wch: 16 }, // Fecha
      { wch: 12 }, // Días
      { wch: 20 }, // Criticidad
      { wch: 12 }, // Estado
      { wch: 24 }, // Servicio
      { wch: 30 }, // Detalle
      { wch: 28 }, // Paciente
      { wch: 16 }, // Tipo Doc
      { wch: 18 }, // Num Doc
      { wch: 16 }, // Tel
      { wch: 26 }, // Email
      { wch: 22 }, // EPS
      { wch: 16 }, // Canal
      { wch: 22 }  // Institución
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes Recibidas')
    XLSX.writeFile(wb, `solicitudes_recibidas_criticas_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // ── Exportación a CSV ───────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      'Radicado', 'Fecha Radicacion', 'Dias Abierta', 'Criticidad',
      'Servicio', 'Paciente', 'Tipo Documento', 'Numero Documento',
      'Telefono', 'Email', 'EPS', 'Canal', 'Institucion'
    ]
    const rows = filtered.map(r => [
      r.radicado,
      r.created_at_formatted,
      r.days_open,
      r.days_open >= 5 ? 'Critica' : 'En Tiempo',
      r.servicio,
      r.patient_name,
      r.patient_document_type,
      r.patient_document_number,
      r.patient_phone,
      r.patient_email,
      r.patient_eps,
      r.canal,
      r.institution
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `solicitudes_recibidas_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Exportación a PDF ───────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.default
    const autoTableModule = await import('jspdf-autotable')
    const autoTable = autoTableModule.default

    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })

    doc.setFillColor(15, 118, 110)
    doc.rect(0, 0, 297, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.text('Salud360 — Reporte de Solicitudes Recibidas y Críticas', 14, 14)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')} · Total registros: ${filtered.length}`, 200, 14)

    const tableRows = filtered.map(r => [
      r.radicado,
      `${r.created_at_formatted} (${r.days_open}d)`,
      r.servicio,
      r.patient_name,
      `${r.patient_document_type} ${r.patient_document_number}`,
      r.patient_phone,
      r.patient_eps,
      r.canal === 'presencial' ? 'Presencial' : 'Online',
      r.days_open >= 5 ? `CRÍTICA (${r.days_open}d)` : 'En Tiempo'
    ])

    autoTable(doc, {
      startY: 28,
      head: [['Radicado', 'Fecha (Días)', 'Servicio', 'Paciente', 'Documento', 'Teléfono', 'EPS', 'Canal', 'Criticidad']],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      margin: { left: 12, right: 12 }
    })

    doc.save(`solicitudes_recibidas_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Total Recibidas */}
        <button
          type="button"
          onClick={() => setCriticidadFilter('all')}
          className={`text-left rounded-2xl p-4 transition-all border ${
            criticidadFilter === 'all'
              ? 'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md ring-2 ring-teal-500'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Total Recibidas</span>
            <Inbox className={`w-4 h-4 ${criticidadFilter === 'all' ? 'text-teal-300' : 'text-slate-500'}`} />
          </div>
          <p className="text-3xl font-extrabold mt-1">{stats.total}</p>
          <span className="text-xs opacity-75 mt-0.5 block">Pendientes en bandeja</span>
        </button>

        {/* Críticas (+5 días) */}
        <button
          type="button"
          onClick={() => setCriticidadFilter('critical')}
          className={`text-left rounded-2xl p-4 transition-all border ${
            criticidadFilter === 'critical'
              ? 'bg-gradient-to-br from-rose-600 to-red-800 text-white shadow-md ring-2 ring-red-400'
              : 'bg-rose-50/70 hover:bg-rose-100 text-rose-900 border-rose-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">Críticas (+5d)</span>
            <AlertTriangle className={`w-4 h-4 ${criticidadFilter === 'critical' ? 'text-white' : 'text-rose-600 animate-pulse'}`} />
          </div>
          <p className="text-3xl font-extrabold mt-1 text-rose-600 dark:text-white">{stats.critical}</p>
          <span className="text-xs opacity-80 mt-0.5 block">Vencen SLA oportuno</span>
        </button>

        {/* Muy Críticas (+10 días) */}
        <button
          type="button"
          onClick={() => setCriticidadFilter('urgent')}
          className={`text-left rounded-2xl p-4 transition-all border ${
            criticidadFilter === 'urgent'
              ? 'bg-gradient-to-br from-red-800 to-rose-950 text-white shadow-md ring-2 ring-red-300'
              : 'bg-red-50/50 hover:bg-red-100 text-red-950 border-red-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">Muy Críticas (+10d)</span>
            <Flame className={`w-4 h-4 ${criticidadFilter === 'urgent' ? 'text-amber-300' : 'text-red-700'}`} />
          </div>
          <p className="text-3xl font-extrabold mt-1 text-red-700 dark:text-white">{stats.urgent}</p>
          <span className="text-xs opacity-80 mt-0.5 block">Atención prioritaria</span>
        </button>

        {/* En Tiempo (< 5 días) */}
        <button
          type="button"
          onClick={() => setCriticidadFilter('ontime')}
          className={`text-left rounded-2xl p-4 transition-all border ${
            criticidadFilter === 'ontime'
              ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md ring-2 ring-emerald-300'
              : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border-emerald-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">En Tiempo (&lt;5d)</span>
            <CheckCircle2 className={`w-4 h-4 ${criticidadFilter === 'ontime' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <p className="text-3xl font-extrabold mt-1 text-emerald-700 dark:text-white">{stats.ontime}</p>
          <span className="text-xs opacity-80 mt-0.5 block">Dentro de oportunidad</span>
        </button>

        {/* Top Servicios Preview */}
        <div className="col-span-2 md:col-span-4 lg:col-span-1 rounded-2xl p-3.5 bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Top Servicios</span>
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="flex flex-wrap gap-1">
            {stats.topServices.length === 0 ? (
              <span className="text-xs text-slate-400 italic">Sin datos</span>
            ) : (
              stats.topServices.map(([serv, count]) => (
                <button
                  key={serv}
                  type="button"
                  onClick={() => setSelectedService(selectedService === serv ? 'ALL' : serv)}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                    selectedService === serv
                      ? 'bg-teal-700 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300'
                  }`}
                  title={`Filtrar por ${serv}`}
                >
                  <span className="truncate max-w-[90px]">{serv}</span>
                  <span className="bg-slate-100 text-slate-800 text-[10px] px-1 rounded font-bold">
                    {count}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Toolbar: Fechas + Filtros Rápidos + Exportaciones ───────────────── */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Selector de Rango de Fechas */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Periodo radicación:</span>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-slate-400">—</span>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <Button
              size="sm"
              onClick={handleRefresh}
              disabled={isPending}
              className="bg-teal-700 hover:bg-teal-800 text-white h-8 text-xs font-semibold rounded-lg"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Filtrar
            </Button>
            {(from || to) && (
              <button
                type="button"
                onClick={() => { setFrom(''); setTo(''); }}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Limpiar fecha
              </button>
            )}
          </div>

          {/* Botones de Exportación */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-semibold h-8 rounded-lg"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold h-8 rounded-lg"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> CSV
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={filtered.length === 0}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold h-8 rounded-lg"
            >
              <FileText className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
          </div>
        </div>

        {/* Barra de Filtros: Criticidad + Servicio + Canal + Buscador */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
          {/* Píldoras de Criticidad */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all' as CriticidadFilter, label: 'Todas las Recibidas', count: stats.total },
              { id: 'critical' as CriticidadFilter, label: '🔴 Críticas (+5d)', count: stats.critical },
              { id: 'urgent' as CriticidadFilter, label: '🔥 Muy Críticas (+10d)', count: stats.urgent },
              { id: 'ontime' as CriticidadFilter, label: '🟢 En Tiempo (<5d)', count: stats.ontime },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setCriticidadFilter(tab.id); setPage(1); }}
                className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all border ${
                  criticidadFilter === tab.id
                    ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  criticidadFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
            {/* Filtro por Servicio */}
            <select
              value={selectedService}
              onChange={e => { setSelectedService(e.target.value); setPage(1); }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[200px]"
            >
              <option value="ALL">Todos los servicios ({serviceOptions.length})</option>
              {serviceOptions.map(serv => (
                <option key={serv} value={serv}>{serv}</option>
              ))}
            </select>

            {/* Filtro por Canal */}
            <select
              value={selectedCanal}
              onChange={e => { setSelectedCanal(e.target.value); setPage(1); }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Todos los canales</option>
              <option value="online">Online (Portal)</option>
              <option value="presencial">Presencial</option>
            </select>

            {/* Búsqueda en Vivo */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar radicado, paciente, doc, servicio..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-8 text-xs bg-white border-slate-200"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Banner de Alerta Crítica (si hay solicitudes atrasadas) ──────────── */}
      {stats.critical > 0 && criticidadFilter !== 'critical' && (
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-rose-900">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <span>
              Atención: Tienes <strong>{stats.critical} solicitud(es) en estado Recibida</strong> con más de 5 días de espera sin gestionar.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCriticidadFilter('critical')}
            className="text-xs font-bold text-rose-700 underline hover:text-rose-900 shrink-0"
          >
            Filtrar Críticas →
          </button>
        </div>
      )}

      {/* ── Tabla de Solicitudes ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {paginated.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Inbox className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600 text-base">No se encontraron solicitudes recibidas</p>
            <p className="text-xs text-slate-400">
              Prueba cambiando los filtros de criticidad, servicio o rango de fechas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Radicado</th>
                  <th className="px-4 py-3">Fecha / Tiempo</th>
                  <th className="px-4 py-3">Servicio Solicitado</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3">Institución</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map(r => {
                  const isCrit = r.days_open >= 5
                  const isHighlyCrit = r.days_open >= 10
                  const isWarning = r.days_open >= 3 && r.days_open < 5

                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        isHighlyCrit
                          ? 'bg-rose-50/50 hover:bg-rose-100/60 border-l-4 border-l-red-600'
                          : isCrit
                          ? 'bg-rose-50/30 hover:bg-rose-50/70 border-l-4 border-l-rose-500'
                          : isWarning
                          ? 'bg-amber-50/20 hover:bg-amber-50/50 border-l-4 border-l-amber-400'
                          : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Radicado */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {isCrit && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                          )}
                          <Link
                            href={`/admin/requests/${r.id}`}
                            className="font-mono font-bold text-teal-700 hover:text-teal-900 hover:underline"
                            title="Ver detalle de la solicitud"
                          >
                            {r.radicado}
                          </Link>
                        </div>
                        {r.status === 'escalated' ? (
                          <span className="inline-block mt-0.5 text-[10px] font-extrabold bg-red-100 text-red-800 px-1.5 py-0.2 rounded border border-red-200">
                            🚨 Escalada
                          </span>
                        ) : (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                            Recibida
                          </span>
                        )}
                      </td>

                      {/* Fecha y Tiempo de Espera */}
                      <td className="px-4 py-3">
                        <span className="text-slate-700 font-medium block">{r.created_at_formatted}</span>
                        <div className="mt-0.5">
                          {isHighlyCrit ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-600 text-white shadow-xs">
                              <Flame className="w-2.5 h-2.5" /> {r.days_open} días abierta
                            </span>
                          ) : isCrit ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-600" /> {r.days_open} días abierta
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-2.5 h-2.5 text-amber-600" /> {r.days_open} días abierta
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              ✓ {r.days_open} día(s) abierta
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Servicio Solicitado */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className={`inline-block font-bold text-xs px-2.5 py-1 rounded-lg border ${getServiceColor(r.servicio)}`}>
                          {r.servicio}
                        </span>
                        {r.request_detail && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic" title={r.request_detail}>
                            &ldquo;{r.request_detail}&rdquo;
                          </p>
                        )}
                        {r.request_type && r.request_type !== r.servicio && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Trámite: {r.request_type}
                          </span>
                        )}
                      </td>

                      {/* Paciente y Documento */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 text-xs">{r.patient_name}</p>
                        <p className="text-slate-500 text-[11px] font-mono mt-0.5">
                          {r.patient_document_type} {r.patient_document_number}
                        </p>
                        {r.patient_eps && r.patient_eps !== '—' && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                            {r.patient_eps}
                          </span>
                        )}
                      </td>

                      {/* Contacto (WhatsApp + Email) */}
                      <td className="px-4 py-3">
                        {r.patient_phone && r.patient_phone !== '—' ? (
                          <a
                            href={`https://wa.me/57${r.patient_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-emerald-700 hover:text-emerald-800 hover:underline font-bold"
                            title="Chatear por WhatsApp con el paciente"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {r.patient_phone}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin teléfono</span>
                        )}
                        {r.patient_email && r.patient_email !== '—' && (
                          <p className="text-slate-500 text-[11px] truncate max-w-[160px] mt-0.5" title={r.patient_email}>
                            {r.patient_email}
                          </p>
                        )}
                      </td>

                      {/* Canal */}
                      <td className="px-4 py-3">
                        {r.canal === 'presencial' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                            🏥 Presencial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <Globe className="w-2.5 h-2.5" /> Online
                          </span>
                        )}
                      </td>

                      {/* Institución */}
                      <td className="px-4 py-3 text-slate-700 font-medium text-[11px]">
                        {r.institution}
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/requests/${r.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors shadow-2xs"
                        >
                          Gestionar <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Barra de Paginación ───────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Mostrar</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-slate-200 rounded-md bg-white px-2 py-1 text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>por página</span>
              <span className="text-slate-400 mx-1">·</span>
              <span>
                Mostrando <strong>{Math.min(filtered.length, (safePage - 1) * pageSize + 1)}</strong> - <strong>{Math.min(filtered.length, safePage * pageSize)}</strong> de <strong>{filtered.length}</strong> solicitudes
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(1)}
                disabled={safePage <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              <span className="px-2 font-semibold">
                Página {safePage} de {totalPages}
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(totalPages)}
                disabled={safePage >= totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

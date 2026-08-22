'use client'

import { useState, useMemo } from 'react'
import type { Circular1552Row } from '@/app/admin/reports/circular1552-actions'
import { FileDown, Search, X, AlertTriangle, CheckCircle2, Clock, FileText, CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(rows: Circular1552Row[], from: string, to: string) {
  const headers = [
    'Tipo Documento', 'Número Documento', 'Código Prestador', 'Nombre Prestador',
    'Entidad', 'Régimen', 'Servicio', 'Código CUPS',
    'Fecha Solicitud', 'Fecha Asignación', 'Fecha Cita', 'Hora Cita',
    'Oportunidad (días)', 'Médico', 'Especialidad', 'Estado Cita', 'Canal'
  ]
  const csvRows = [
    headers.join(';'),
    ...rows.map(r => [
      r.tipoDocumento, r.numeroDocumento, r.codigoPrestador, r.nombrePrestador,
      r.entidad, r.regimen, r.servicio, r.codigoCups,
      r.fechaSolicitud, r.fechaAsignacion, r.fechaCita, r.horaCita,
      r.oportunidad, r.medico, r.especialidad, r.estadoCita, r.canal
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
  ]
  const rangeLabel = from && to ? `${from}_al_${to}` : from || to || 'todo'
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `Circular_1552_${rangeLabel}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Badges ────────────────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'Asistió')
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" />Asistió</span>
  if (estado === 'No Asistió')
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3" />No Asistió</span>
  if (estado === 'Cancelada')
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"><X className="h-3 w-3" />Cancelada</span>
  if (estado === 'Sin Confirmar')
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700"><AlertTriangle className="h-3 w-3" />Sin Confirmar</span>
  return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><Clock className="h-3 w-3" />Pendiente</span>
}

function OportunidadBadge({ dias }: { dias: number }) {
  if (dias <= 3)  return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{dias}d ✓</span>
  if (dias <= 5)  return <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{dias}d ⚠</span>
  return <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">{dias}d ✗</span>
}

// ── Main Component ────────────────────────────────────────────────────────────
interface Props {
  initialData: Circular1552Row[]
  onFetch: (from: string, to: string) => Promise<Circular1552Row[]>
}

export function Circular1552Table({ initialData, onFetch }: Props) {
  const [data, setData]         = useState<Circular1552Row[]>(initialData)
  const [generated, setGenerated] = useState(initialData.length > 0)
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(false)

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(r =>
      r.numeroDocumento.toLowerCase().includes(q) ||
      r.especialidad.toLowerCase().includes(q) ||
      r.medico.toLowerCase().includes(q) ||
      r.estadoCita.toLowerCase().includes(q) ||
      r.servicio.toLowerCase().includes(q)
    )
  }, [data, search])

  async function handleGenerate() {
    setLoading(true)
    try {
      const result = await onFetch(from, to)
      setData(result)
      setGenerated(true)
      setSearch('')
    } finally {
      setLoading(false)
    }
  }

  const incumpleCount = filtered.filter(r => r.oportunidad > 3 && r.estadoCita !== 'Cancelada').length
  const cumpleCount   = filtered.filter(r => r.oportunidad <= 3).length

  // ── Pantalla de inicio (antes de generar) ──────────────────────────────────
  if (!generated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-teal-50 border-2 border-teal-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Generar Reporte Circular 1552</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Selecciona el rango de <span className="font-semibold text-slate-700">Fecha de Cita</span> para el que deseas generar el reporte.
            Si no seleccionas fechas, se incluirán <span className="font-semibold text-slate-700">todas las citas registradas</span>.
          </p>
        </div>

        {/* Selector de fechas */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-8 py-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Desde</span>
            <input
              type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Hasta</span>
            <input
              type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-teal-600/30 text-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Generando reporte...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generar Reporte
            </>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center">
          El reporte se genera bajo demanda para optimizar el rendimiento del sistema.<br />
          Las fechas filtran por <strong>Fecha de la Cita</strong>.
        </p>
      </div>
    )
  }

  // ── Tabla de resultados ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro de fechas */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Desde</span>
            <input
              type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="text-xs border-0 bg-transparent focus:outline-none text-slate-700"
            />
            <span className="text-xs text-slate-500 font-medium">Hasta</span>
            <input
              type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-xs border-0 bg-transparent focus:outline-none text-slate-700"
            />
            <button
              onClick={handleGenerate} disabled={loading}
              className="text-xs font-semibold bg-teal-600 text-white px-3 py-1 rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Cargando...' : 'Filtrar'}
            </button>
          </div>

          {/* Buscar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar por documento, especialidad..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-52 border-slate-200"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Exportar */}
        <button
          onClick={() => exportCSV(filtered, from, to)}
          className="flex items-center gap-2 text-sm font-semibold bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <FileDown className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-800">{filtered.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total citas</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{cumpleCount}</p>
          <p className="text-xs text-emerald-600 mt-0.5">≤ 3 días (Cumple)</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{incumpleCount}</p>
          <p className="text-xs text-red-600 mt-0.5">&gt; 3 días (Incumple)</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[
                'Tipo Doc.', 'Nº Documento', 'Cód. Prestador', 'Prestador',
                'Entidad', 'Régimen', 'Servicio', 'CUPS',
                'F. Solicitud', 'F. Asignación', 'F. Cita', 'Hora',
                'Oportunidad', 'Médico', 'Especialidad', 'Estado', 'Canal'
              ].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={17} className="text-center py-12 text-slate-400">
                  No hay datos para el período seleccionado.
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${row.oportunidad > 3 && row.estadoCita !== 'Cancelada' ? 'bg-red-50/40' : ''}`}>
                  <td className="px-3 py-2 text-slate-600">{row.tipoDocumento}</td>
                  <td className="px-3 py-2 font-mono text-slate-700">{row.numeroDocumento}</td>
                  <td className="px-3 py-2 font-mono text-slate-500">{row.codigoPrestador}</td>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{row.nombrePrestador}</td>
                  <td className="px-3 py-2 text-slate-600">{row.entidad}</td>
                  <td className="px-3 py-2 text-slate-600">{row.regimen}</td>
                  <td className="px-3 py-2 text-slate-700">{row.servicio}</td>
                  <td className="px-3 py-2 font-mono text-teal-700 font-semibold">{row.codigoCups}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.fechaSolicitud}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.fechaAsignacion}</td>
                  <td className="px-3 py-2 text-slate-700 font-medium whitespace-nowrap">{row.fechaCita}</td>
                  <td className="px-3 py-2 text-slate-600">{row.horaCita}</td>
                  <td className="px-3 py-2"><OportunidadBadge dias={row.oportunidad} /></td>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{row.medico}</td>
                  <td className="px-3 py-2 text-slate-600">{row.especialidad}</td>
                  <td className="px-3 py-2"><EstadoBadge estado={row.estadoCita} /></td>
                  <td className="px-3 py-2">
                    {row.canal === 'Presencial' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">🏥 Presencial</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">🌐 Online</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 text-right">
        {filtered.length} registro{filtered.length !== 1 ? 's' : ''} · Las fechas filtran por <strong>Fecha de la Cita</strong> · Oportunidad &gt; 3 días es incumplimiento según Resolución 1552/2013
      </p>
    </div>
  )
}

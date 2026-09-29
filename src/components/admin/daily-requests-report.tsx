'use client'

import { useState, useTransition } from 'react'
import { Calendar, Globe, Users, TrendingUp, Download, RefreshCw, Loader2 } from 'lucide-react'

interface DailyRow {
  date: string
  total: number
  online: number
  presencial: number
  by_type: Record<string, number>
}

interface ChannelSummary { canal: string; total: number; percentage: number }
interface TypeChannelRow { type: string; total: number; online: number; presencial: number }

interface Props {
  initialDaily: DailyRow[]
  initialChannels: ChannelSummary[]
  initialTypes: TypeChannelRow[]
  onRefresh: (from: string, to: string) => Promise<{ daily: DailyRow[]; channels: ChannelSummary[]; types: TypeChannelRow[] }>
}

const TYPE_COLORS: Record<string, string> = {
  'Primera Vez':         'bg-teal-100 text-teal-700',
  'Prótesis':            'bg-blue-100 text-blue-700',
  'Cirugía Oral':        'bg-purple-100 text-purple-700',
  'Cirugía Maxilofacial':'bg-pink-100 text-pink-700',
  'Rehabilitación':      'bg-orange-100 text-orange-700',
  'Odontopediatría':     'bg-yellow-100 text-yellow-700',
  'Ortodoncia':          'bg-indigo-100 text-indigo-700',
  'Periodoncia':         'bg-green-100 text-green-700',
  'Endodoncia':          'bg-red-100 text-red-700',
  'Anestesia':           'bg-slate-100 text-slate-700',
  'Ayuda Diagnostica (Radiografía, Tomografía, Fotografía, Perfilograma)': 'bg-cyan-100 text-cyan-700',
  'Demanda Inducida':    'bg-amber-100 text-amber-800',
}

function today() { return new Date().toISOString().split('T')[0] }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]
}
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${day} ${months[+m - 1]}`
}

export function DailyRequestsReport({ initialDaily, initialChannels, initialTypes, onRefresh }: Props) {
  const [daily, setDaily]     = useState(initialDaily)
  const [channels, setChannels] = useState(initialChannels)
  const [types, setTypes]     = useState(initialTypes)
  const [from, setFrom]       = useState(daysAgo(29))
  const [to, setTo]           = useState(today())
  const [pending, start]      = useTransition()

  // Summary stats
  const totalPeriod    = daily.reduce((s, r) => s + r.total, 0)
  const totalOnline    = daily.reduce((s, r) => s + r.online, 0)
  const totalPresencial = daily.reduce((s, r) => s + r.presencial, 0)
  const avgPerDay      = daily.length > 0 ? (totalPeriod / daily.filter(r => r.total > 0).length || 1).toFixed(1) : '0'
  const maxDay         = daily.reduce((m, r) => r.total > m.total ? r : m, { date: '', total: 0, online: 0, presencial: 0, by_type: {} })
  const allTypes       = Array.from(new Set(daily.flatMap(r => Object.keys(r.by_type)))).sort()

  function handleRefresh() {
    start(async () => {
      const res = await onRefresh(from, to)
      setDaily(res.daily); setChannels(res.channels); setTypes(res.types)
    })
  }

  // Export CSV
  function exportCSV() {
    const header = ['Fecha','Total','Online','Presencial',...allTypes].join(',')
    const rows = daily.map(r => [
      r.date, r.total, r.online, r.presencial,
      ...allTypes.map(t => r.by_type[t] || 0)
    ].join(','))
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `solicitudes_diarias_${from}_${to}.csv`; a.click()
  }

  const barMax = Math.max(...daily.map(r => r.total), 1)

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Desde</label>
          <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Hasta</label>
          <input type="date" value={to} min={from} max={today()} onChange={e => setTo(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button onClick={handleRefresh} disabled={pending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Actualizar
        </button>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
        {/* Quick filters */}
        {[['Hoy', 0], ['7 días', 6], ['30 días', 29]].map(([label, n]) => (
          <button key={label as string} onClick={() => { setFrom(daysAgo(n as number)); setTo(today()) }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs text-slate-600 font-medium transition-colors">
            {label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total período', value: totalPeriod, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Online (Portal)', value: totalOnline, icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Presencial', value: totalPresencial, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Promedio diario', value: avgPerDay, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Channel breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-600" /> Canal de Atención
          </h3>
          <div className="space-y-4">
            {channels.map(ch => (
              <div key={ch.canal}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-slate-700">{ch.canal}</span>
                  <span className="text-sm font-bold text-slate-800">{ch.total} <span className="text-slate-400 font-normal text-xs">({ch.percentage}%)</span></span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${ch.canal.includes('Online') ? 'bg-teal-500' : 'bg-orange-400'}`}
                    style={{ width: `${ch.percentage}%` }} />
                </div>
              </div>
            ))}
            {totalPeriod > 0 && maxDay.total > 0 && (
              <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
                📅 Día con más solicitudes: <span className="font-semibold text-slate-600">{fmtDate(maxDay.date)}</span> con <span className="font-semibold">{maxDay.total}</span> solicitudes
              </p>
            )}
          </div>
        </div>

        {/* Type × Channel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Tipo de Solicitud × Canal</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {types.map(row => (
              <div key={row.type} className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 max-w-[180px] truncate ${TYPE_COLORS[row.type] || 'bg-slate-100 text-slate-600'}`}
                  title={row.type}>{row.type}</span>
                <div className="flex-1 flex items-center gap-1.5">
                  <div className="h-2 rounded-full bg-teal-400" style={{ width: `${(row.online / (types[0]?.total || 1)) * 80}%`, minWidth: row.online > 0 ? '4px' : '0' }} title={`Online: ${row.online}`} />
                  <div className="h-2 rounded-full bg-orange-400" style={{ width: `${(row.presencial / (types[0]?.total || 1)) * 80}%`, minWidth: row.presencial > 0 ? '4px' : '0' }} title={`Presencial: ${row.presencial}`} />
                </div>
                <span className="text-xs font-bold text-slate-700 shrink-0 w-8 text-right">{row.total}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-full bg-teal-400"/><span className="text-xs text-slate-500">Online</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-full bg-orange-400"/><span className="text-xs text-slate-500">Presencial</span></div>
          </div>
        </div>
      </div>

      {/* Daily bar chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 text-sm mb-5">Solicitudes por Día</h3>
        {daily.filter(r => r.total > 0).length === 0
          ? <p className="text-center text-slate-400 text-sm py-8">No hay solicitudes en el período seleccionado.</p>
          : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-max" style={{ minHeight: '120px' }}>
              {daily.map(row => (
                <div key={row.date} className="flex flex-col items-center gap-1 group" style={{ minWidth: '28px' }}>
                  <span className="text-[10px] font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    {row.total}
                  </span>
                  <div className="w-6 flex flex-col-reverse rounded-sm overflow-hidden cursor-pointer"
                    style={{ height: `${Math.max((row.total / barMax) * 100, row.total > 0 ? 4 : 0)}px` }}
                    title={`${fmtDate(row.date)}: ${row.total} total (${row.online} online, ${row.presencial} presencial)`}>
                    <div className="bg-teal-400" style={{ flexBasis: `${row.total > 0 ? (row.online / row.total) * 100 : 0}%`, flexShrink: 0 }} />
                    <div className="bg-orange-400" style={{ flexBasis: `${row.total > 0 ? (row.presencial / row.total) * 100 : 0}%`, flexShrink: 0 }} />
                  </div>
                  <span className="text-[10px] text-slate-400 -rotate-45 origin-left mt-1" style={{ width: '36px' }}>
                    {fmtDate(row.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800 text-sm">Detalle Diario por Tipo</h3>
          <p className="text-xs text-slate-400 mt-0.5">Solo se muestran días con al menos una solicitud</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2 font-semibold">Fecha</th>
                <th className="px-4 py-2 font-semibold text-right">Total</th>
                <th className="px-4 py-2 font-semibold text-right text-teal-600">Online</th>
                <th className="px-4 py-2 font-semibold text-right text-orange-500">Presencial</th>
                {allTypes.map(t => (
                  <th key={t} className="px-4 py-2 font-semibold text-right text-slate-500 max-w-[100px]" title={t}>
                    {t.length > 12 ? t.slice(0, 10) + '…' : t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daily.filter(r => r.total > 0).reverse().map((row, i) => (
                <tr key={row.date} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-2 font-medium text-slate-700">{fmtDate(row.date)}</td>
                  <td className="px-4 py-2 text-right font-bold text-slate-800">{row.total}</td>
                  <td className="px-4 py-2 text-right text-teal-600 font-medium">{row.online || '—'}</td>
                  <td className="px-4 py-2 text-right text-orange-500 font-medium">{row.presencial || '—'}</td>
                  {allTypes.map(t => (
                    <td key={t} className="px-4 py-2 text-right text-slate-600">
                      {row.by_type[t] ? <span className="font-semibold">{row.by_type[t]}</span> : <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

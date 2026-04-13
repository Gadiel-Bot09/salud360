'use client'

import { useState, useTransition } from 'react'
import {
  CheckCircle2, XCircle, Clock, RotateCcw, Search,
  ChevronDown, Stethoscope, Building2, CalendarClock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { markAttendance, resetAttendance, type AppointmentWithPatient } from '@/app/admin/appointments/actions'

type FilterState = 'all' | 'pending' | 'attended' | 'absent'

const FILTER_OPTIONS: { id: FilterState; label: string; emoji: string }[] = [
  { id: 'all',      label: 'Todas',         emoji: '📋' },
  { id: 'pending',  label: 'Sin Marcar',    emoji: '⏳' },
  { id: 'attended', label: 'Asistieron',    emoji: '✅' },
  { id: 'absent',   label: 'No Asistieron', emoji: '❌' },
]

interface Props {
  appointments: AppointmentWithPatient[]
}

export function AppointmentsTable({ appointments: initial }: Props) {
  const [appts, setAppts]         = useState<AppointmentWithPatient[]>(initial)
  const [filter, setFilter]       = useState<FilterState>('all')
  const [search, setSearch]       = useState('')
  const [notesMap, setNotesMap]   = useState<Record<string, string>>({})
  const [expandedId, setExpanded] = useState<string | null>(null)
  const [isPending, start]        = useTransition()

  const handleMark = (id: string, attended: boolean) => {
    const notes = notesMap[id] || ''
    start(async () => {
      const res = await markAttendance(id, attended, notes)
      if (res.success) {
        setAppts(prev => prev.map(a =>
          a.id === id ? { ...a, attended, attended_at: new Date().toISOString(), attendance_notes: notes } : a
        ))
        setExpanded(null)
      }
    })
  }

  const handleReset = (id: string) => {
    start(async () => {
      const res = await resetAttendance(id)
      if (res.success) {
        setAppts(prev => prev.map(a =>
          a.id === id ? { ...a, attended: null, attended_at: null, attendance_notes: null } : a
        ))
      }
    })
  }

  const filtered = appts.filter(a => {
    const matchFilter =
      filter === 'all'      ? true :
      filter === 'pending'  ? a.attended === null :
      filter === 'attended' ? a.attended === true :
      a.attended === false

    const matchSearch = !search ||
      a.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      a.radicado.toLowerCase().includes(search.toLowerCase())

    return matchFilter && matchSearch
  })

  const counts = {
    all:      appts.length,
    pending:  appts.filter(a => a.attended === null).length,
    attended: appts.filter(a => a.attended === true).length,
    absent:   appts.filter(a => a.attended === false).length,
  }

  if (appts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
        <CalendarClock className="w-14 h-14 text-slate-200 mb-4" />
        <p className="text-slate-500 font-semibold text-lg">Sin citas para esta fecha</p>
        <p className="text-slate-400 text-sm mt-1">Seleccione otra fecha o asigne citas desde las solicitudes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total',          value: counts.all,      color: 'from-slate-600 to-slate-800' },
          { label: 'Sin Marcar',     value: counts.pending,  color: 'from-amber-500 to-amber-700' },
          { label: 'Asistieron',     value: counts.attended, color: 'from-emerald-500 to-emerald-700' },
          { label: 'No Asistieron',  value: counts.absent,   color: 'from-red-500 to-red-700' },
        ].map(c => (
          <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-2xl p-4 text-white shadow-lg`}>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-2 flex-1">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border ${
                filter === f.id
                  ? 'bg-teal-700 text-white border-teal-700 shadow'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
              }`}
            >
              {f.emoji} {f.label}
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${filter === f.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente o radicado..."
            className="pl-9 h-9 text-sm w-56 border-slate-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p className="font-medium">No hay citas con ese filtro</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(appt => {
              const isExpanded = expandedId === appt.id
              const timeStr = appt.appointment_time?.slice(0, 5) || '--:--'

              return (
                <div key={appt.id} className={`transition-colors ${appt.attended === true ? 'bg-emerald-50/40' : appt.attended === false ? 'bg-red-50/40' : 'bg-white'}`}>
                  {/* Main Row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Time */}
                    <div className="text-center shrink-0 w-14">
                      <p className="text-lg font-bold text-teal-700 leading-none">{timeStr}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Hora</p>
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800">{appt.patient_name}</p>
                        <span className="text-xs text-slate-400 font-mono">{appt.radicado}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{appt.request_type}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
                        {appt.doctor_name && (
                          <span className="flex items-center gap-1">
                            <Stethoscope className="w-3 h-3" /> {appt.doctor_name}
                          </span>
                        )}
                        {appt.specialty && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {appt.specialty}
                          </span>
                        )}
                      </div>
                      {appt.attended !== null && (
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold ${appt.attended ? 'text-emerald-600' : 'text-red-600'}`}>
                            {appt.attended ? '✅ Asistió' : '❌ No Asistió'}
                          </span>
                          {appt.attended_at && (
                            <span className="text-xs text-slate-400">
                              — {new Date(appt.attended_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {appt.attendance_notes && (
                            <span className="text-xs italic text-slate-500">"{appt.attendance_notes}"</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {appt.attended === null ? (
                        <>
                          <button
                            onClick={() => setExpanded(isExpanded ? null : appt.id)}
                            disabled={isPending}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Asistió
                            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleMark(appt.id, false)}
                            disabled={isPending}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> No Asistió
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleReset(appt.id)}
                          disabled={isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
                          title="Deshacer registro de asistencia"
                        >
                          <RotateCcw className="w-3 h-3" /> Deshacer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expand panel for confirmed attendance + notes */}
                  {isExpanded && appt.attended === null && (
                    <div className="px-5 pb-4 bg-emerald-50 border-t border-emerald-100 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-start gap-3 pt-3">
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
                            Nota del admisionista (opcional)
                          </label>
                          <Input
                            value={notesMap[appt.id] || ''}
                            onChange={e => setNotesMap(prev => ({ ...prev, [appt.id]: e.target.value }))}
                            placeholder="Ej: Llegó 10 min tarde, fue atendido..."
                            className="h-9 text-sm border-emerald-200 bg-white"
                          />
                        </div>
                        <Button
                          onClick={() => handleMark(appt.id, true)}
                          disabled={isPending}
                          className="mt-5 bg-emerald-600 hover:bg-emerald-700 h-9 text-sm shrink-0"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar Asistencia
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

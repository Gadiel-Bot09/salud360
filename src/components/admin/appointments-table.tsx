'use client'

import { useState, useTransition } from 'react'
import {
  CheckCircle2, XCircle, Clock, RotateCcw, Search,
  ChevronDown, Stethoscope, Building2, CalendarClock, MessageCircle, AlertTriangle, Trash2, MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  markAttendance,
  resetAttendance,
  sendManualWhatsAppReminder,
  getDoctorsAndSpecialties,
  cancelAppointmentsBulk,
  silentDeleteAppointment,
  type AppointmentWithPatient
} from '@/app/admin/appointments/actions'
import { useToast } from '@/hooks/use-toast'

type FilterState = 'all' | 'pending' | 'attended' | 'absent' | 'cancelled'

const FILTER_OPTIONS: { id: FilterState; label: string; emoji: string }[] = [
  { id: 'all',       label: 'Todas',         emoji: '📋' },
  { id: 'pending',   label: 'Sin Marcar',    emoji: '⏳' },
  { id: 'attended',  label: 'Asistieron',    emoji: '✅' },
  { id: 'absent',    label: 'No Asistieron', emoji: '❌' },
  { id: 'cancelled', label: 'Canceladas',    emoji: '🚫' },
]

interface Props {
  appointments: AppointmentWithPatient[]
  isAdmin?: boolean
}

export function AppointmentsTable({ appointments: initial, isAdmin = false }: Props) {
  const router                    = useRouter()
  const [appts, setAppts]         = useState<AppointmentWithPatient[]>(initial)
  const [filter, setFilter]       = useState<FilterState>('all')
  const [search, setSearch]       = useState('')
  const [notesMap, setNotesMap]   = useState<Record<string, string>>({})
  const [expandedId, setExpanded] = useState<string | null>(null)
  const [isPending, start]        = useTransition()
  const { toast }                 = useToast()

  // Bulk modal state
  const [isBulkOpen, setIsBulkOpen]           = useState(false)
  const [doctorsList, setDoctorsList]         = useState<string[]>([])
  const [specialtiesList, setSpecialtiesList] = useState<string[]>([])
  const [dateFrom, setDateFrom]               = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo]                   = useState(new Date().toISOString().split('T')[0])
  const [selDoctor, setSelDoctor]             = useState('ALL')
  const [selSpecialty, setSelSpecialty]       = useState('ALL')
  const [bulkReason, setBulkReason]           = useState('')

  // Single cancel modal state
  const [singleCancelId, setSingleCancelId]   = useState<string | null>(null)
  const [singleReason, setSingleReason]       = useState('')

  // Silent delete modal state (admin only)
  const [silentDeleteAppt, setSilentDeleteAppt] = useState<AppointmentWithPatient | null>(null)
  const [silentObs, setSilentObs]               = useState('')

  const openBulkModal = async () => {
    setIsBulkOpen(true)
    const data = await getDoctorsAndSpecialties()
    setDoctorsList(data.doctors)
    setSpecialtiesList(data.specialties)
  }

  const handleBulkCancel = () => {
    if (!bulkReason.trim()) {
      toast({ title: 'Motivo requerido', description: 'Por favor ingresa el motivo de la cancelación.', variant: 'destructive' })
      return
    }
    start(async () => {
      const res = await cancelAppointmentsBulk({
        dateFrom,
        dateTo,
        doctorName: selDoctor,
        specialty: selSpecialty,
        reason: bulkReason.trim()
      })
      if (res.success) {
        toast({
          title: 'Citas canceladas',
          description: `Se cancelaron ${res.count} cita(s) y se notificó por WhatsApp a ${res.notified} paciente(s).`,
          variant: 'default'
        })
        setIsBulkOpen(false)
        setBulkReason('')
        router.refresh()
        setAppts(prev => prev.map(a => {
          if (a.appointment_date >= dateFrom && a.appointment_date <= dateTo && a.attended === null && !a.cancelled) {
            if (selDoctor !== 'ALL' && a.doctor_name !== selDoctor) return a
            if (selSpecialty !== 'ALL' && a.specialty !== selSpecialty) return a
            return { ...a, cancelled: true, cancelled_at: new Date().toISOString(), cancellation_reason: bulkReason.trim() }
          }
          return a
        }))
      } else {
        toast({ title: 'Error al cancelar', description: res.error || 'No se pudieron cancelar las citas.', variant: 'destructive' })
      }
    })
  }

  const handleSingleCancel = () => {
    if (!singleCancelId || !singleReason.trim()) {
      toast({ title: 'Motivo requerido', description: 'Por favor ingresa el motivo de la cancelación.', variant: 'destructive' })
      return
    }
    start(async () => {
      const res = await cancelAppointmentsBulk({
        appointmentIds: [singleCancelId],
        reason: singleReason.trim()
      })
      if (res.success) {
        toast({
          title: 'Cita cancelada',
          description: `La cita fue cancelada y se notificó al paciente por WhatsApp.`,
          variant: 'default'
        })
        const id = singleCancelId
        const reason = singleReason.trim()
        setSingleCancelId(null)
        setSingleReason('')
        router.refresh()
        setAppts(prev => prev.map(a => a.id === id ? { ...a, cancelled: true, cancelled_at: new Date().toISOString(), cancellation_reason: reason } : a))
      } else {
        toast({ title: 'Error al cancelar', description: res.error || 'No se pudo cancelar la cita.', variant: 'destructive' })
      }
    })
  }

  const handleSilentDelete = () => {
    if (!silentDeleteAppt || !silentObs.trim()) {
      toast({ title: 'Observación requerida', description: 'Debes ingresar una observación para continuar.', variant: 'destructive' })
      return
    }
    start(async () => {
      const res = await silentDeleteAppointment(silentDeleteAppt.id, silentObs.trim())
      if (res.success) {
        toast({
          title: '🔧 Cita eliminada',
          description: 'La cita fue eliminada sin notificar al paciente. El registro de auditoría quedó guardado.',
          variant: 'default'
        })
        const deletedId = silentDeleteAppt.id
        setSilentDeleteAppt(null)
        setSilentObs('')
        setAppts(prev => prev.filter(a => a.id !== deletedId))
        router.refresh()
      } else {
        toast({ title: 'Error', description: res.error || 'No se pudo eliminar la cita.', variant: 'destructive' })
      }
    })
  }

  const handleSendWhatsApp = (id: string) => {
    start(async () => {
      const res = await sendManualWhatsAppReminder(id)
      if (res.success) {
        toast({ title: 'Mensaje enviado', description: 'El recordatorio se envió por WhatsApp al paciente.', variant: 'default' })
      } else {
        toast({ title: 'Error al enviar', description: res.error || 'No se pudo enviar el mensaje.', variant: 'destructive' })
      }
    })
  }

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
      filter === 'all'       ? true :
      filter === 'pending'   ? a.attended === null && !a.cancelled :
      filter === 'attended'  ? a.attended === true && !a.cancelled :
      filter === 'absent'    ? a.attended === false && !a.cancelled :
      a.cancelled === true

    const matchSearch = !search ||
      a.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      a.radicado.toLowerCase().includes(search.toLowerCase())

    return matchFilter && matchSearch
  })

  const counts = {
    all:       appts.length,
    pending:   appts.filter(a => a.attended === null && !a.cancelled).length,
    attended:  appts.filter(a => a.attended === true && !a.cancelled).length,
    absent:    appts.filter(a => a.attended === false && !a.cancelled).length,
    cancelled: appts.filter(a => a.cancelled === true).length,
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
      {/* Alert Banner for Pending Appointments */}
      {counts.pending > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
          <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-red-800 font-bold text-lg">¡Atención! Tienes citas pendientes por gestionar</h3>
            <p className="text-red-600 text-sm mt-1">
              Hay <strong>{counts.pending}</strong> cita(s) en esta fecha a las que no se les ha marcado la asistencia. Por favor, gestiónalas para mantener las estadísticas actualizadas.
            </p>
          </div>
          <Button 
            onClick={() => setFilter('pending')}
            variant="outline"
            className="bg-white hover:bg-red-50 text-red-700 border-red-200 shrink-0 mt-2 md:mt-0 shadow-sm"
          >
            Ver Pendientes
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total',          value: counts.all,       color: 'from-slate-600 to-slate-800' },
          { label: 'Sin Marcar',     value: counts.pending,   color: 'from-amber-500 to-amber-700' },
          { label: 'Asistieron',     value: counts.attended,  color: 'from-emerald-500 to-emerald-700' },
          { label: 'No Asistieron',  value: counts.absent,    color: 'from-red-500 to-red-700' },
          { label: 'Canceladas',     value: counts.cancelled, color: 'from-rose-700 to-purple-900' },
        ].map(c => (
          <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-2xl p-4 text-white shadow-lg`}>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search + Actions Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
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
        <div className="flex items-center gap-3">
          <Button
            onClick={openBulkModal}
            variant="destructive"
            className="bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-xl text-sm h-9 shadow-sm"
          >
            🚫 Cancelar Agenda / Citas
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar paciente o radicado..."
              className="pl-9 h-9 text-sm w-56 border-slate-200 bg-white"
            />
          </div>
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
                        {appt.patient_phone && appt.patient_phone !== '—' && (
                          <span className="flex items-center gap-1 font-mono">
                            📞 {appt.patient_phone}
                          </span>
                        )}
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
                        {appt.branch_name && (
                          <span className="flex items-center gap-1 text-teal-700 font-medium">
                            <MapPin className="w-3 h-3" /> {appt.branch_name}
                          </span>
                        )}
                      </div>
                      {appt.cancelled && (
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            🚫 Cita Cancelada — Motivo: "{appt.cancellation_reason || 'Sin motivo especificado'}"
                          </span>
                          {appt.cancelled_at && (
                            <span className="text-xs text-slate-400">
                              — {new Date(appt.cancelled_at).toLocaleDateString('es-CO')} {new Date(appt.cancelled_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                            </span>
                          )}
                        </div>
                      )}
                      {!appt.cancelled && appt.attended !== null && (
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold ${appt.attended ? 'text-emerald-600' : 'text-red-600'}`}>
                            {appt.attended ? '✅ Asistió' : '❌ No Asistió'}
                          </span>
                          {appt.attended_at && (
                            <span className="text-xs text-slate-400">
                              — {new Date(appt.attended_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
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
                      {appt.cancelled ? (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          🚫 Cancelada
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSendWhatsApp(appt.id)}
                            disabled={isPending || appt.patient_phone === '—'}
                            className="flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 hover:bg-green-100 text-green-700 transition-colors disabled:opacity-50"
                            title={appt.patient_phone === '—' ? 'Sin teléfono' : 'Enviar WhatsApp de recordatorio'}
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                          </button>
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
                              <button
                                onClick={() => { setSingleCancelId(appt.id); setSingleReason('') }}
                                disabled={isPending}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                                title="Cancelar esta cita y notificar por WhatsApp"
                              >
                                🚫 Cancelar
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => { setSilentDeleteAppt(appt); setSilentObs('') }}
                                  disabled={isPending}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 border border-slate-200 hover:border-red-300 transition-colors"
                                  title="[Admin] Eliminar cita sin notificar al paciente"
                                >
                                  <Trash2 className="w-3 h-3" /> Eliminar
                                </button>
                              )}
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
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expand panel for confirmed attendance + notes */}
                  {isExpanded && appt.attended === null && !appt.cancelled && (
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

      {/* Dialog for Bulk Cancellation */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>🚫</span> Cancelación Masiva o de Agenda
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Esta opción cancelará las citas pendientes que cumplan los criterios y notificará inmediatamente por WhatsApp a los pacientes afectados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Fecha Desde</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Fecha Hasta</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Filtrar Médico</label>
                <select
                  value={selDoctor}
                  onChange={e => setSelDoctor(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="ALL">Todos los médicos</option>
                  {doctorsList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Filtrar Especialidad</label>
                <select
                  value={selSpecialty}
                  onChange={e => setSelSpecialty(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="ALL">Todas las especialidades</option>
                  {specialtiesList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Motivo de Cancelación (Obligatorio)</label>
              <textarea
                value={bulkReason}
                onChange={e => setBulkReason(e.target.value)}
                placeholder="Ej: Incapacidad médica del especialista, reasignación de agenda..."
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm h-20 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkOpen(false)} disabled={isPending}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleBulkCancel} disabled={isPending} className="bg-rose-700 hover:bg-rose-800">
              {isPending ? 'Cancelando y notificando...' : 'Confirmar y Notificar a Pacientes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Single Appointment Cancellation */}
      <Dialog open={!!singleCancelId} onOpenChange={val => !val && setSingleCancelId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>🚫</span> Cancelar Cita Individual
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Se registrará la cancelación y se enviará un WhatsApp al paciente informando el motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <label className="text-xs font-semibold text-slate-700 block mb-1">Motivo de Cancelación</label>
            <textarea
              value={singleReason}
              onChange={e => setSingleReason(e.target.value)}
              placeholder="Ej: El paciente solicitó cancelación, especialista ausente..."
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm h-20 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSingleCancelId(null)} disabled={isPending}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleSingleCancel} disabled={isPending} className="bg-rose-700 hover:bg-rose-800">
              {isPending ? 'Procesando...' : 'Cancelar Cita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Silent Delete (Admin only) */}
      <Dialog open={!!silentDeleteAppt} onOpenChange={val => !val && setSilentDeleteAppt(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Eliminar Cita sin Notificar
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Esta acción elimina la cita de la base de datos <strong>sin enviar ningún mensaje al paciente</strong>. Se guardará un registro de auditoría en el historial de la solicitud.
            </DialogDescription>
          </DialogHeader>

          {silentDeleteAppt && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm space-y-0.5">
              <p className="font-bold text-amber-800">⚠️ Datos de la cita a eliminar:</p>
              <p className="text-amber-700">👤 Paciente: <strong>{silentDeleteAppt.patient_name}</strong></p>
              <p className="text-amber-700">📋 Radicado: <strong>{silentDeleteAppt.radicado}</strong></p>
              <p className="text-amber-700">📅 Fecha: <strong>{silentDeleteAppt.appointment_date}</strong> · 🕐 <strong>{silentDeleteAppt.appointment_time?.slice(0,5)}</strong></p>
              {silentDeleteAppt.doctor_name && <p className="text-amber-700">👨‍⚕️ Médico: <strong>{silentDeleteAppt.doctor_name}</strong></p>}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Observación de corrección <span className="text-red-600">*</span>
            </label>
            <textarea
              value={silentObs}
              onChange={e => setSilentObs(e.target.value)}
              placeholder="Ej: Error de asignación por gestor [Nombre]. Se elimina para reasignar correctamente. Sin notificar al paciente."
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <p className="text-xs text-slate-400">Este texto quedará registrado en el historial de la solicitud para efectos de auditoría y procesos disciplinarios.</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSilentDeleteAppt(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSilentDelete}
              disabled={isPending || !silentObs.trim()}
              className="bg-red-700 hover:bg-red-800 text-white font-semibold"
            >
              {isPending ? (
                <><span className="mr-2 animate-spin">⏳</span> Eliminando...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> Eliminar sin Notificar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

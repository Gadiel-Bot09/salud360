'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  CheckCircle2, XCircle, Clock, RotateCcw, Search,
  ChevronDown, Stethoscope, Building2, CalendarClock, MessageCircle,
  AlertTriangle, Trash2, MapPin, RefreshCw, Eye, ArrowRight, Globe, ShieldCheck, UserCheck, Calendar
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
import { RescheduleDialog } from '@/components/admin/reschedule-dialog'
import { useToast } from '@/hooks/use-toast'

type FilterState = 'all' | 'pending' | 'attended' | 'absent' | 'rescheduled' | 'cancelled'

const FILTER_OPTIONS: { id: FilterState; label: string; emoji: string }[] = [
  { id: 'all',         label: 'Citas del Día', emoji: '📋' },
  { id: 'pending',     label: 'Sin Marcar',    emoji: '⏳' },
  { id: 'attended',    label: 'Asistieron',    emoji: '✅' },
  { id: 'absent',      label: 'No Asistieron', emoji: '❌' },
  { id: 'rescheduled', label: 'Reprogramadas', emoji: '🔄' },
  { id: 'cancelled',   label: 'Canceladas',    emoji: '🚫' },
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

  // Sync local state when server props update (e.g. date change or router.refresh)
  useEffect(() => {
    setAppts(initial)
  }, [initial])

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

  // Reschedule dialog state (to perform a reschedule)
  const [rescheduleAppt, setRescheduleAppt]     = useState<AppointmentWithPatient | null>(null)
  const [rescheduleData, setRescheduleData]     = useState<{ doctors: string[]; specialties: string[]; branches: string[] }>({ doctors: [], specialties: [], branches: [] })

  // Detail Modals for Rescheduled and Cancelled appointments
  const [selectedRescheduledAppt, setSelectedRescheduledAppt] = useState<AppointmentWithPatient | null>(null)
  const [selectedCancelledAppt, setSelectedCancelledAppt]     = useState<AppointmentWithPatient | null>(null)

  const openBulkModal = async () => {
    setIsBulkOpen(true)
    const data = await getDoctorsAndSpecialties()
    setDoctorsList(data.doctors)
    setSpecialtiesList(data.specialties)
  }

  const openRescheduleModal = async (appt: AppointmentWithPatient) => {
    const data = await getDoctorsAndSpecialties()
    setRescheduleData({ doctors: data.doctors, specialties: data.specialties, branches: data.branches })
    setRescheduleAppt(appt)
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
      filter === 'all'         ? !a.cancelled && !a.rescheduled :
      filter === 'pending'     ? a.attended === null && !a.cancelled && !a.rescheduled :
      filter === 'attended'    ? a.attended === true && !a.cancelled && !a.rescheduled :
      filter === 'absent'      ? a.attended === false && !a.cancelled && !a.rescheduled :
      filter === 'rescheduled' ? a.rescheduled === true && !a.cancelled :
      a.cancelled === true

    const matchSearch = !search ||
      a.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      a.radicado.toLowerCase().includes(search.toLowerCase())

    return matchFilter && matchSearch
  })

  const counts: Record<FilterState, number> = {
    all:         appts.filter(a => !a.cancelled && !a.rescheduled).length,
    pending:     appts.filter(a => a.attended === null && !a.cancelled && !a.rescheduled).length,
    attended:    appts.filter(a => a.attended === true && !a.cancelled && !a.rescheduled).length,
    absent:      appts.filter(a => a.attended === false && !a.cancelled && !a.rescheduled).length,
    rescheduled: appts.filter(a => a.rescheduled === true && !a.cancelled).length,
    cancelled:   appts.filter(a => a.cancelled === true).length,
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
              Hay <strong>{counts.pending}</strong> cita(s) activa(s) en esta fecha a las que no se les ha marcado la asistencia. Por favor, gestiónalas para mantener las estadísticas actualizadas.
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

      {/* Summary Cards (Clickables para filtrar) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { id: 'all' as FilterState,         label: 'Citas Activas', value: counts.all,         color: 'from-slate-600 to-slate-800' },
          { id: 'pending' as FilterState,     label: 'Sin Marcar',    value: counts.pending,     color: 'from-amber-500 to-amber-700' },
          { id: 'attended' as FilterState,    label: 'Asistieron',    value: counts.attended,    color: 'from-emerald-500 to-emerald-700' },
          { id: 'absent' as FilterState,      label: 'No Asistieron', value: counts.absent,      color: 'from-red-500 to-red-700' },
          { id: 'rescheduled' as FilterState, label: 'Reprogramadas', value: counts.rescheduled, color: 'from-orange-500 to-amber-700' },
          { id: 'cancelled' as FilterState,   label: 'Canceladas',    value: counts.cancelled,   color: 'from-rose-700 to-purple-900' },
        ].map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={`text-left bg-gradient-to-br ${c.color} rounded-2xl p-4 text-white shadow-lg transition-all hover:scale-[1.02] ${
              filter === c.id ? 'ring-4 ring-teal-400/50 scale-[1.02]' : 'opacity-95 hover:opacity-100'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </button>
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

      {/* Context Banner when viewing Rescheduled or Cancelled filter */}
      {filter === 'rescheduled' && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Estás viendo las <strong>citas reprogramadas</strong> que originalmente estaban agendadas para esta fecha. Haz clic en cualquier cita para ver la <strong>nueva fecha asignada y su trazabilidad</strong>.
            </span>
          </div>
        </div>
      )}
      {filter === 'cancelled' && (
        <div className="bg-rose-50/90 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Estás viendo las <strong>citas canceladas</strong> de esta fecha. Haz clic en cualquier cita para consultar el <strong>canal de cancelación (Portal Web o Panel Admin), responsable y motivo</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <p className="font-semibold text-slate-600">
              {filter === 'all' && 'No hay citas activas programadas para este día'}
              {filter === 'pending' && 'No hay citas pendientes por confirmar asistencia en esta fecha'}
              {filter === 'attended' && 'Aún no hay citas marcadas como asistidas en esta fecha'}
              {filter === 'absent' && 'No hay citas marcadas como inasistencia en esta fecha'}
              {filter === 'rescheduled' && 'No hay citas reprogramadas registradas en esta fecha'}
              {filter === 'cancelled' && 'No hay citas canceladas registradas en esta fecha'}
            </p>
            {filter === 'all' && (counts.rescheduled > 0 || counts.cancelled > 0) && (
              <p className="text-xs text-slate-400">
                Nota: En esta fecha hay{' '}
                {counts.rescheduled > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter('rescheduled')}
                    className="text-amber-600 font-semibold underline hover:text-amber-700 mr-2"
                  >
                    {counts.rescheduled} cita(s) reprogramada(s)
                  </button>
                )}
                {counts.cancelled > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter('cancelled')}
                    className="text-rose-600 font-semibold underline hover:text-rose-700"
                  >
                    {counts.cancelled} cita(s) cancelada(s)
                  </button>
                )}
                {' '}ocultas de la lista principal.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(appt => {
              const isExpanded = expandedId === appt.id
              const timeStr = appt.appointment_time?.slice(0, 5) || '--:--'
              const isRescheduled = !!appt.rescheduled && !appt.cancelled
              const isCancelled = !!appt.cancelled

              return (
                <div
                  key={appt.id}
                  onClick={() => {
                    if (isRescheduled) setSelectedRescheduledAppt(appt)
                    else if (isCancelled) setSelectedCancelledAppt(appt)
                  }}
                  className={`transition-colors ${
                    isRescheduled
                      ? 'bg-amber-50/25 hover:bg-amber-50/60 cursor-pointer'
                      : isCancelled
                      ? 'bg-rose-50/25 hover:bg-rose-50/60 cursor-pointer'
                      : appt.attended === true
                      ? 'bg-emerald-50/40'
                      : appt.attended === false
                      ? 'bg-red-50/40'
                      : 'bg-white'
                  }`}
                >
                  {/* Main Row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Time */}
                    <div className="text-center shrink-0 w-14">
                      <p className={`text-lg font-bold leading-none ${isRescheduled ? 'text-amber-700 line-through decoration-amber-400' : isCancelled ? 'text-rose-700 line-through decoration-rose-400' : 'text-teal-700'}`}>
                        {timeStr}
                      </p>
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

                      {/* Cancelled Badges */}
                      {isCancelled && (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                            🚫 Cancelada — Motivo: &ldquo;{appt.cancellation_clean_reason || appt.cancellation_reason || 'Sin motivo especificado'}&rdquo;
                          </span>
                          {appt.cancellation_channel === 'portal_paciente' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                              <Globe className="w-3 h-3" /> Canal: Portal Web (Paciente)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-300">
                              <Building2 className="w-3 h-3" /> Canal: Panel Admin {appt.cancelled_by_name ? `(${appt.cancelled_by_name})` : ''}
                            </span>
                          )}
                          {appt.cancelled_at && (
                            <span className="text-xs text-slate-400">
                              · {new Date(appt.cancelled_at).toLocaleDateString('es-CO')} {new Date(appt.cancelled_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Rescheduled Badges */}
                      {isRescheduled && (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                            🔄 Reprogramada — Motivo: &ldquo;{appt.rescheduled_reason || 'Sin motivo'}&rdquo;
                          </span>
                          {appt.rescheduled_to ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                              <Calendar className="w-3 h-3 text-teal-600" />
                              Nueva fecha: {appt.rescheduled_to.appointment_date} · {appt.rescheduled_to.appointment_time?.slice(0, 5)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 italic">
                              Clic para consultar trazabilidad de reprogramación
                            </span>
                          )}
                        </div>
                      )}

                      {/* Badge on Active Appointment that came from a previous reschedule */}
                      {appt.rescheduled_from_id && !appt.rescheduled && !appt.cancelled && (
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            ↩️ Cita originada por reprogramación previa
                          </span>
                        </div>
                      )}

                      {/* Attendance Status for Active Appointments */}
                      {!isCancelled && !isRescheduled && appt.attended !== null && (
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
                            <span className="text-xs italic text-slate-500">&ldquo;{appt.attendance_notes}&rdquo;</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {isCancelled ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedCancelledAppt(appt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200 transition-colors shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Detalle de Cancelación
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => { setSilentDeleteAppt(appt); setSilentObs('') }}
                              disabled={isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 border border-slate-200 hover:border-red-300 transition-colors"
                              title="[Admin] Eliminar registro sin notificar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      ) : isRescheduled ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedRescheduledAppt(appt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Nueva Fecha y Detalle
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => { setSilentDeleteAppt(appt); setSilentObs('') }}
                              disabled={isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 border border-slate-200 hover:border-red-300 transition-colors"
                              title="[Admin] Eliminar registro sin notificar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </>
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
                              <button
                                onClick={() => openRescheduleModal(appt)}
                                disabled={isPending}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                                title="Reprogramar esta cita y notificar al paciente"
                              >
                                <RefreshCw className="w-3 h-3" /> Reprogramar
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
                  {isExpanded && appt.attended === null && !isCancelled && !isRescheduled && (
                    <div className="px-5 pb-4 bg-emerald-50 border-t border-emerald-100 animate-in slide-in-from-top-2 duration-200" onClick={e => e.stopPropagation()}>
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

      {/* Reschedule Dialog */}
      {rescheduleAppt && (
        <RescheduleDialog
          open={!!rescheduleAppt}
          onOpenChange={open => { if (!open) setRescheduleAppt(null) }}
          appointment={{
            id:               rescheduleAppt.id,
            appointment_date: rescheduleAppt.appointment_date,
            appointment_time: rescheduleAppt.appointment_time,
            doctor_name:      rescheduleAppt.doctor_name,
            specialty:        rescheduleAppt.specialty,
            branch_name:      rescheduleAppt.branch_name,
            patient_name:     rescheduleAppt.patient_name,
            radicado:         rescheduleAppt.radicado,
          }}
          doctors={rescheduleData.doctors}
          specialties={rescheduleData.specialties}
          branches={rescheduleData.branches}
          onSuccess={() => {
            const targetId = rescheduleAppt.id
            setAppts(prev => prev.map(a => a.id === targetId ? { ...a, rescheduled: true, rescheduled_at: new Date().toISOString() } : a))
            setRescheduleAppt(null)
            router.refresh()
          }}
        />
      )}

      {/* Modal 1: Detalle de Cita Reprogramada (Comparativa Fecha Anterior vs. Nueva Fecha) */}
      <Dialog open={!!selectedRescheduledAppt} onOpenChange={val => !val && setSelectedRescheduledAppt(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <RefreshCw className="w-5 h-5" />
              </div>
              Detalle de Cita Reprogramada
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Trazabilidad completa del cambio de fecha y datos de la nueva cita asignada al paciente.
            </DialogDescription>
          </DialogHeader>

          {selectedRescheduledAppt && (
            <div className="space-y-4 py-2">
              {/* Patient Header Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Paciente</p>
                  <p className="text-base font-bold text-slate-800">{selectedRescheduledAppt.patient_name}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                    <span>📞 {selectedRescheduledAppt.patient_phone}</span>
                    {selectedRescheduledAppt.patient_email && selectedRescheduledAppt.patient_email !== '—' && (
                      <span>✉️ {selectedRescheduledAppt.patient_email}</span>
                    )}
                  </div>
                </div>
                <div className="sm:text-right">
                  <span className="inline-block font-mono text-xs font-bold bg-slate-200/80 text-slate-700 px-2.5 py-1 rounded-lg">
                    {selectedRescheduledAppt.radicado}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">{selectedRescheduledAppt.request_type}</p>
                </div>
              </div>

              {/* Comparison Grid: Old Date vs New Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                {/* Original Appointment */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      Cita Anterior (Reprogramada)
                    </span>
                  </div>
                  <div className="pt-1 space-y-1.5 text-sm">
                    <p className="text-slate-700">
                      <span className="text-slate-500 text-xs block">Fecha y Hora Original:</span>
                      <strong className="text-amber-900 line-through">
                        {selectedRescheduledAppt.appointment_date} · {selectedRescheduledAppt.appointment_time?.slice(0, 5)}
                      </strong>
                    </p>
                    <p className="text-xs text-slate-600">
                      <strong>Especialista:</strong> {selectedRescheduledAppt.doctor_name || 'No especificado'}
                    </p>
                    <p className="text-xs text-slate-600">
                      <strong>Especialidad:</strong> {selectedRescheduledAppt.specialty || 'No especificada'}
                    </p>
                    <p className="text-xs text-slate-600">
                      <strong>Sede:</strong> {selectedRescheduledAppt.branch_name || 'Sede Principal'}
                    </p>
                  </div>
                </div>

                {/* New Scheduled Appointment */}
                <div className="rounded-xl border-2 border-teal-500 bg-teal-50/50 p-4 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Nueva Cita Asignada
                    </span>
                  </div>
                  {selectedRescheduledAppt.rescheduled_to ? (
                    <div className="pt-1 space-y-1.5 text-sm">
                      <div>
                        <span className="text-teal-700 text-xs block font-medium">Nueva Fecha y Hora:</span>
                        <p className="text-lg font-extrabold text-teal-900">
                          {selectedRescheduledAppt.rescheduled_to.appointment_date} · {selectedRescheduledAppt.rescheduled_to.appointment_time?.slice(0, 5)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-700">
                        <strong>Especialista:</strong> {selectedRescheduledAppt.rescheduled_to.doctor_name || 'No especificado'}
                      </p>
                      <p className="text-xs text-slate-700">
                        <strong>Especialidad:</strong> {selectedRescheduledAppt.rescheduled_to.specialty || 'No especificada'}
                      </p>
                      <p className="text-xs text-slate-700">
                        <strong>Sede:</strong> {selectedRescheduledAppt.rescheduled_to.branch_name || 'Sede Principal'}
                      </p>
                      <div className="pt-1">
                        {selectedRescheduledAppt.rescheduled_to.cancelled ? (
                          <span className="inline-block text-[11px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                            🚫 Estado actual: Cancelada posteriormente
                          </span>
                        ) : selectedRescheduledAppt.rescheduled_to.rescheduled ? (
                          <span className="inline-block text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                            🔄 Estado actual: Reprogramada nuevamente
                          </span>
                        ) : selectedRescheduledAppt.rescheduled_to.attended === true ? (
                          <span className="inline-block text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                            ✅ Estado actual: Paciente Asistió
                          </span>
                        ) : selectedRescheduledAppt.rescheduled_to.attended === false ? (
                          <span className="inline-block text-[11px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded border border-red-200">
                            ❌ Estado actual: No Asistió
                          </span>
                        ) : (
                          <span className="inline-block text-[11px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
                            ⏳ Estado actual: Activa / Por confirmar asistencia
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-xs text-slate-500 italic">
                      No se encontró el vínculo directo a la cita destino en registros históricos.
                    </div>
                  )}
                </div>
              </div>

              {/* Audit / Reason Box */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" /> Auditoría de Reprogramación
                  </span>
                  {selectedRescheduledAppt.rescheduled_at && (
                    <span className="text-slate-400">
                      Registrado el {new Date(selectedRescheduledAppt.rescheduled_at).toLocaleDateString('es-CO')} a las{' '}
                      {new Date(selectedRescheduledAppt.rescheduled_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 block">Canal de Gestión:</span>
                    <span className="font-semibold text-slate-700">🏥 Panel Administrativo Salud360</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Gestionado por:</span>
                    <span className="font-semibold text-slate-700">
                      {selectedRescheduledAppt.rescheduled_by_name || 'Gestor de la Institución'}
                    </span>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400 block mb-1">Motivo de la Reprogramación:</span>
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 text-amber-950 font-medium">
                    &ldquo;{selectedRescheduledAppt.rescheduled_reason || 'Sin motivo especificado'}&rdquo;
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {selectedRescheduledAppt?.rescheduled_to ? (
              <Button
                type="button"
                onClick={() => {
                  const targetDate = selectedRescheduledAppt.rescheduled_to!.appointment_date
                  setSelectedRescheduledAppt(null)
                  setFilter('all')
                  router.push(`/admin/appointments?date=${targetDate}`)
                }}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold"
              >
                <Calendar className="w-4 h-4 mr-1.5" />
                Ir a la agenda del {selectedRescheduledAppt.rescheduled_to.appointment_date}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : <div />}
            <Button variant="outline" onClick={() => setSelectedRescheduledAppt(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Detalle de Cita Cancelada (Según Canal: Portal Paciente vs. Panel Admin) */}
      <Dialog open={!!selectedCancelledAppt} onOpenChange={val => !val && setSelectedCancelledAppt(null)}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <XCircle className="w-5 h-5" />
              </div>
              Detalle de Cita Cancelada
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Información de auditoría, motivo y canal por el cual se canceló la cita.
            </DialogDescription>
          </DialogHeader>

          {selectedCancelledAppt && (
            <div className="space-y-4 py-2">
              {/* Channel Banner */}
              {selectedCancelledAppt.cancellation_channel === 'portal_paciente' ? (
                <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/70 p-4 flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 shadow-sm">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded">
                      Canal: Autogestión Portal Web
                    </span>
                    <p className="text-sm font-bold text-indigo-950">
                      Cancelada directamente por el Paciente
                    </p>
                    <p className="text-xs text-indigo-800/90 leading-relaxed">
                      El paciente <strong>{selectedCancelledAppt.patient_name}</strong> ingresó al Portal Web de Consulta con su número de radicado y solicitó la cancelación de su cita.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-rose-200 bg-rose-50/70 p-4 flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-700 text-white shrink-0 shadow-sm">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded">
                      Canal: Panel Administrativo (Institución)
                    </span>
                    <p className="text-sm font-bold text-rose-950">
                      Cancelada internamente por la Institución
                    </p>
                    <p className="text-xs text-rose-800/90 leading-relaxed">
                      Gestión ejecutada desde el módulo de Citas por{' '}
                      <strong>{selectedCancelledAppt.cancelled_by_name || 'Gestor / Administrador de la Institución'}</strong>, enviando notificación automática al paciente.
                    </p>
                  </div>
                </div>
              )}

              {/* Patient & Appointment Info */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div>
                    <span className="text-slate-400 uppercase font-bold tracking-wider block text-[10px]">Paciente</span>
                    <span className="text-sm font-bold text-slate-800">{selectedCancelledAppt.patient_name}</span>
                  </div>
                  <span className="font-mono font-bold bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">
                    {selectedCancelledAppt.radicado}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block">Fecha y Hora de la Cita:</span>
                    <strong className="text-slate-800 text-sm">
                      {selectedCancelledAppt.appointment_date} · {selectedCancelledAppt.appointment_time?.slice(0, 5)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Teléfono del Paciente:</span>
                    <strong className="text-slate-800 font-mono">{selectedCancelledAppt.patient_phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Especialista:</span>
                    <strong className="text-slate-700">{selectedCancelledAppt.doctor_name || 'No especificado'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Especialidad / Sede:</span>
                    <strong className="text-slate-700">
                      {selectedCancelledAppt.specialty || 'General'}
                      {selectedCancelledAppt.branch_name ? ` · ${selectedCancelledAppt.branch_name}` : ''}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Reason & Timestamp */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wider">
                    Motivo de la Cancelación
                  </span>
                  {selectedCancelledAppt.cancelled_at && (
                    <span className="text-slate-400">
                      📅 {new Date(selectedCancelledAppt.cancelled_at).toLocaleDateString('es-CO')} · 🕐{' '}
                      {new Date(selectedCancelledAppt.cancelled_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                    </span>
                  )}
                </div>
                <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3 text-rose-950 font-medium text-sm">
                  &ldquo;{selectedCancelledAppt.cancellation_clean_reason || selectedCancelledAppt.cancellation_reason || 'Sin motivo especificado'}&rdquo;
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCancelledAppt(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

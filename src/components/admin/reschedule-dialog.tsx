'use client'

import { useState, useTransition } from 'react'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { rescheduleAppointment } from '@/app/admin/appointments/actions'
import { useToast } from '@/hooks/use-toast'

interface RescheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: {
    id: string
    appointment_date: string
    appointment_time: string
    doctor_name: string | null
    specialty: string | null
    branch_name: string | null
    patient_name: string
    radicado: string
  }
  doctors: string[]
  specialties: string[]
  branches: string[]
  onSuccess: (newApptId: string) => void
}

export function RescheduleDialog({
  open,
  onOpenChange,
  appointment,
  doctors,
  specialties,
  branches,
  onSuccess,
}: RescheduleDialogProps) {
  const { toast } = useToast()
  const [isPending, start] = useTransition()

  const [newDate, setNewDate]           = useState('')
  const [newTime, setNewTime]           = useState('')
  const [newDoctor, setNewDoctor]       = useState(appointment.doctor_name || '')
  const [newSpecialty, setNewSpecialty] = useState(appointment.specialty || '')
  const [newBranch, setNewBranch]       = useState(appointment.branch_name || '')
  const [reason, setReason]             = useState('')

  const oldTimeStr = appointment.appointment_time?.slice(0, 5) || '—'

  const handleSubmit = () => {
    if (!newDate || !newTime) {
      toast({ title: 'Campos requeridos', description: 'Debes ingresar la nueva fecha y hora.', variant: 'destructive' })
      return
    }
    if (!reason.trim()) {
      toast({ title: 'Motivo requerido', description: 'El motivo de la reprogramacion es obligatorio.', variant: 'destructive' })
      return
    }

    start(async () => {
      const res = await rescheduleAppointment({
        appointmentId: appointment.id,
        newDate,
        newTime,
        newDoctor:    newDoctor || undefined,
        newSpecialty: newSpecialty || undefined,
        newBranch:    newBranch || undefined,
        reason:       reason.trim(),
      })

      if (res.success && res.newAppointmentId) {
        toast({
          title: 'Cita reprogramada',
          description: `La cita fue reprogramada para el ${newDate} a las ${newTime.slice(0, 5)}. Se notifico al paciente por email y WhatsApp.`,
        })
        onOpenChange(false)
        onSuccess(res.newAppointmentId)
        setNewDate(''); setNewTime(''); setNewDoctor(''); setNewSpecialty(''); setNewBranch(''); setReason('')
      } else {
        toast({ title: 'Error al reprogramar', description: res.error || 'No se pudo reprogramar la cita.', variant: 'destructive' })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-amber-600" />
            Reprogramar Cita
          </DialogTitle>
          <DialogDescription>
            Paciente: <strong>{appointment.patient_name}</strong> &mdash; {appointment.radicado}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Current appointment - read only */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Cita Actual (sera marcada como reprogramada)</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-amber-900">
              <span><strong>Fecha:</strong> {appointment.appointment_date}</span>
              <span><strong>Hora:</strong> {oldTimeStr}</span>
              <span><strong>Doctor:</strong> {appointment.doctor_name || '—'}</span>
              <span><strong>Especialidad:</strong> {appointment.specialty || '—'}</span>
              {appointment.branch_name && <span className="col-span-2"><strong>Sede:</strong> {appointment.branch_name}</span>}
            </div>
          </div>

          {/* New appointment fields */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Nueva Cita</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nueva Fecha <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nueva Hora <span className="text-red-500">*</span></Label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Doctor</Label>
                {doctors.length > 0 ? (
                  <select
                    value={newDoctor}
                    onChange={e => setNewDoctor(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="">Sin cambio / Sin asignar</option>
                    {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <Input value={newDoctor} onChange={e => setNewDoctor(e.target.value)} placeholder="Nombre del doctor" className="h-9 text-sm" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Especialidad</Label>
                {specialties.length > 0 ? (
                  <select
                    value={newSpecialty}
                    onChange={e => setNewSpecialty(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="">Sin cambio / Sin asignar</option>
                    {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <Input value={newSpecialty} onChange={e => setNewSpecialty(e.target.value)} placeholder="Especialidad" className="h-9 text-sm" />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Sede</Label>
              {branches.length > 0 ? (
                <select
                  value={newBranch}
                  onChange={e => setNewBranch(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="">Sin cambio / Sin asignar</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              ) : (
                <Input value={newBranch} onChange={e => setNewBranch(e.target.value)} placeholder="Ej: Sede Principal" className="h-9 text-sm" />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Motivo de la reprogramacion <span className="text-red-500">*</span>
              </Label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ej: El medico asignado no esta disponible en esa fecha, se reagenda para la siguiente semana disponible..."
                rows={3}
                required
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
              {!reason.trim() && (
                <p className="text-xs text-slate-400">Este campo es obligatorio para fines de auditoria.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !newDate || !newTime || !reason.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isPending ? 'Reprogramando...' : 'Confirmar Reprogramacion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

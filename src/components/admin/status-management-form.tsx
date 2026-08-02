'use client'

import { useState, useRef, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, FileText, CalendarPlus, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react'
import type { ResponseTemplate } from '@/app/admin/settings/template-actions'
import { CatalogManager } from './catalog-manager'
import type { Doctor, Specialty } from '@/app/admin/requests/catalog-actions'
import type { Branch } from '@/app/admin/requests/branches-actions'

interface Props {
  action: (fd: FormData) => void
  templates: ResponseTemplate[]
  currentStatus: string
  requestData: {
    patientName: string
    radicado: string
    institution: string
    institutionId: string
  }
  doctors: Doctor[]
  specialties: Specialty[]
  branches: Branch[]
}

export function StatusManagementForm({ action, templates, currentStatus, requestData, doctors, specialties, branches }: Props) {
  const [comment, setComment]         = useState('')
  const [showAppt, setShowAppt]       = useState(false)
  const [apptDate, setApptDate]       = useState('')
  const [apptTime, setApptTime]       = useState('')
  const [apptDoctor, setApptDoctor]   = useState('')
  const [apptSpecialty, setApptSpec]  = useState('')
  const [apptBranch, setApptBranch]   = useState('')
  const [done, setDone]               = useState(false)
  const [isPending, startTransition]  = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef     = useRef<HTMLFormElement>(null)

  const hasAppointment = !!(apptDate && apptTime)

  // Reemplaza un placeholder en el texto si ya fue cargada una plantilla
  const liveReplace = (placeholder: string, value: string) => {
    if (!value || value === 'none') return
    setComment(prev => prev.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value))
  }

  const handleDateChange = (val: string) => { setApptDate(val);   liveReplace('{{fecha_cita}}',   val) }
  const handleTimeChange = (val: string) => { setApptTime(val);   liveReplace('{{hora_cita}}',    val) }
  const handleDoctorChange = (val: string) => { setApptDoctor(val); liveReplace('{{doctor}}',       val) }
  const handleSpecChange   = (val: string) => { setApptSpec(val);   liveReplace('{{especialidad}}', val) }
  const handleBranchChange = (val: string) => { setApptBranch(val); liveReplace('{{sede}}',         val) }

  const applyTemplate = (tmpl: ResponseTemplate) => {
    let body = tmpl.body
    body = body.replace(/{{nombre_paciente}}/g, requestData.patientName)
    body = body.replace(/{{radicado}}/g, requestData.radicado)
    body = body.replace(/{{institucion}}/g, requestData.institution)
    body = body.replace(/{{fecha_cita}}/g,   apptDate      || '{{fecha_cita}}')
    body = body.replace(/{{hora_cita}}/g,    apptTime      || '{{hora_cita}}')
    body = body.replace(/{{doctor}}/g,       apptDoctor    || '{{doctor}}')
    body = body.replace(/{{especialidad}}/g, apptSpecialty || '{{especialidad}}')
    body = body.replace(/{{sede}}/g,         (apptBranch && apptBranch !== 'none') ? apptBranch : '{{sede}}')
    setComment(body)
    textareaRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    // Inject appointment fields (managed via state, not direct inputs)
    fd.set('appt_date',        apptDate)
    fd.set('appt_time',        apptTime)
    fd.set('appt_doctor',      apptDoctor === 'none' ? '' : apptDoctor)
    fd.set('appt_specialty',   apptSpecialty === 'none' ? '' : apptSpecialty)
    fd.set('appt_branch_name', apptBranch === 'none' ? '' : apptBranch)

    startTransition(async () => {
      await (action as (fd: FormData) => Promise<void>)(fd)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    })
  }

  const submitLabel = () => {
    if (isPending) {
      return hasAppointment
        ? 'Guardando cita y notificando...'
        : 'Guardando y notificando...'
    }
    if (done) {
      return hasAppointment ? '¡Cita asignada y notificada!' : '¡Guardado y notificado!'
    }
    return hasAppointment ? 'Guardar Cita y Notificar' : 'Guardar y Notificar'
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

      {/* Status selector */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nuevo Estado</Label>
        <Select name="status" defaultValue={currentStatus}>
          <SelectTrigger className="border-slate-200">
            <SelectValue placeholder="Seleccione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="received">🔵 Recibida</SelectItem>
            <SelectItem value="processing">🟡 En Trámite</SelectItem>
            <SelectItem value="responded">✅ Respondida — Notifica al paciente</SelectItem>
            <SelectItem value="closed">🟢 Cerrada</SelectItem>
            <SelectItem value="escalated">🔴 Escalada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── 1. Appointment toggle (PRIMERO) ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowAppt(!showAppt)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${showAppt ? 'bg-teal-700 text-white border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'}`}
      >
        <span className="flex items-center gap-2">
          <CalendarPlus className="w-4 h-4" />
          Asignar Cita Médica
          {hasAppointment && (
            <span className="ml-1 text-[10px] font-bold bg-white/20 border border-white/30 px-1.5 py-0.5 rounded-full">
              {apptDate} {apptTime}
            </span>
          )}
        </span>
        {showAppt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showAppt && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider">
            📅 Detalles de la Cita — se enviará correo de confirmación al paciente
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Fecha *</Label>
              <Input
                type="date"
                value={apptDate}
                onChange={e => handleDateChange(e.target.value)}
                className="h-9 text-sm border-teal-200 bg-white"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Hora *</Label>
              <Input
                type="time"
                value={apptTime}
                onChange={e => handleTimeChange(e.target.value)}
                className="h-9 text-sm border-teal-200 bg-white"
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-end">
              <Label className="text-xs font-semibold text-slate-600">Doctor / Médico</Label>
              <CatalogManager institutionId={requestData.institutionId} doctors={doctors} specialties={specialties} />
            </div>
            <Select value={apptDoctor} onValueChange={handleDoctorChange}>
              <SelectTrigger className="h-9 text-sm border-teal-200 bg-white">
                <SelectValue placeholder="Seleccione un médico..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled className="hidden">Seleccione...</SelectItem>
                {doctors.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Especialidad</Label>
            <Select value={apptSpecialty} onValueChange={handleSpecChange}>
              <SelectTrigger className="h-9 text-sm border-teal-200 bg-white">
                <SelectValue placeholder="Seleccione una especialidad..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled className="hidden">Seleccione...</SelectItem>
                {specialties.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Sede selector — solo si hay sedes configuradas */}
          {branches.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Sede / Sucursal</Label>
              <Select value={apptBranch} onValueChange={handleBranchChange}>
                <SelectTrigger className="h-9 text-sm border-teal-200 bg-white">
                  <SelectValue placeholder="Seleccione la sede..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin sede específica</SelectItem>
                  {branches.filter(b => b.active).map(b => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name} — {b.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {apptDate && (
            <p className="text-xs text-teal-600 flex items-center gap-1.5">
              ⏰ Se enviarán recordatorios automáticos 24h y 2h antes vía cron-job.org
            </p>
          )}
        </div>
      )}

      {/* ── 2. Template picker (DESPUÉS de la cita) ─────────────────────── */}
      {templates.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Plantilla de Respuesta
          </Label>
          <select
            onChange={e => {
              const tmpl = templates.find(t => t.id === e.target.value)
              if (tmpl) applyTemplate(tmpl)
              e.target.value = ''
            }}
            defaultValue=""
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="" disabled>— Seleccionar plantilla —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400">
            Al seleccionar, el texto se cargará abajo con las variables completadas.
            {hasAppointment && <span className="text-teal-600 font-medium"> (incluye los datos de la cita asignada)</span>}
          </p>
        </div>
      )}

      {/* Comment / Response */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Respuesta / Comentario Interno</Label>
        <Textarea
          ref={textareaRef}
          name="comment"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Escriba la respuesta o seleccione una plantilla arriba..."
          className="min-h-[130px] border-slate-200 text-sm resize-none"
        />
      </div>

      {/* File attachments */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Adjuntar Archivos (PDF/Imágenes a enviar)</Label>
        <Input
          type="file"
          name="attachments"
          multiple
          accept=".pdf,image/*"
          className="text-xs text-slate-500 cursor-pointer file:text-teal-700 file:bg-teal-50 file:border-0 file:mr-4 file:px-4 file:py-1 file:rounded-full file:font-semibold hover:file:bg-teal-100"
        />
      </div>

      {/* Submit button with contextual loading state */}
      <Button
        type="submit"
        disabled={isPending}
        className={`w-full font-semibold mt-2 transition-all duration-300 ${
          done
            ? 'bg-emerald-600 hover:bg-emerald-700'
            : hasAppointment
              ? 'bg-teal-600 hover:bg-teal-700'
              : 'bg-teal-700 hover:bg-teal-800'
        }`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : done ? (
          <CheckCircle2 className="w-4 h-4 mr-2" />
        ) : (
          <Send className="w-4 h-4 mr-2" />
        )}
        {submitLabel()}
      </Button>
    </form>
  )
}

'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, FileText, CalendarPlus, ChevronDown, ChevronUp, Variable } from 'lucide-react'
import type { ResponseTemplate } from '@/app/admin/settings/template-actions'

const VARIABLES: Record<string, string> = {
  '{{nombre_paciente}}': '',
  '{{radicado}}': '',
  '{{fecha_cita}}': '',
  '{{hora_cita}}': '',
  '{{doctor}}': '',
  '{{especialidad}}': '',
  '{{institucion}}': '',
}

interface Props {
  action: (fd: FormData) => void
  templates: ResponseTemplate[]
  currentStatus: string
  requestData: {
    patientName: string
    radicado: string
    institution: string
  }
}

export function StatusManagementForm({ action, templates, currentStatus, requestData }: Props) {
  const [comment, setComment]         = useState('')
  const [showAppt, setShowAppt]       = useState(false)
  const [apptDate, setApptDate]       = useState('')
  const [apptTime, setApptTime]       = useState('')
  const [apptDoctor, setApptDoctor]   = useState('')
  const [apptSpecialty, setApptSpec]  = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const applyTemplate = (tmpl: ResponseTemplate) => {
    // Replace all known variables with actual values or leave placeholder
    let body = tmpl.body
    body = body.replace(/{{nombre_paciente}}/g, requestData.patientName)
    body = body.replace(/{{radicado}}/g, requestData.radicado)
    body = body.replace(/{{institucion}}/g, requestData.institution)
    body = body.replace(/{{fecha_cita}}/g, apptDate   || '{{fecha_cita}}')
    body = body.replace(/{{hora_cita}}/g,  apptTime   || '{{hora_cita}}')
    body = body.replace(/{{doctor}}/g,     apptDoctor || '{{doctor}}')
    body = body.replace(/{{especialidad}}/g, apptSpecialty || '{{especialidad}}')
    setComment(body)
    textareaRef.current?.focus()
  }

  return (
    <form action={action} className="space-y-5">
      {/* Hidden fields for appointment */}
      <input type="hidden" name="appt_date"      value={apptDate} />
      <input type="hidden" name="appt_time"      value={apptTime} />
      <input type="hidden" name="appt_doctor"    value={apptDoctor} />
      <input type="hidden" name="appt_specialty" value={apptSpecialty} />

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

      {/* Template picker */}
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
          <p className="text-xs text-slate-400">Al seleccionar, el texto se cargará abajo con las variables completadas.</p>
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

      {/* Appointment toggle */}
      <button
        type="button"
        onClick={() => setShowAppt(!showAppt)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${showAppt ? 'bg-teal-700 text-white border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'}`}
      >
        <span className="flex items-center gap-2">
          <CalendarPlus className="w-4 h-4" />
          Asignar Cita Médica
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
                onChange={e => setApptDate(e.target.value)}
                className="h-9 text-sm border-teal-200 bg-white"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Hora *</Label>
              <Input
                type="time"
                value={apptTime}
                onChange={e => setApptTime(e.target.value)}
                className="h-9 text-sm border-teal-200 bg-white"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Doctor / Médico</Label>
            <Input
              value={apptDoctor}
              onChange={e => setApptDoctor(e.target.value)}
              placeholder="Ej. Dr. García Rodríguez"
              className="h-9 text-sm border-teal-200 bg-white"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Especialidad</Label>
            <Input
              value={apptSpecialty}
              onChange={e => setApptSpec(e.target.value)}
              placeholder="Ej. Cardiología, Ortopedia..."
              className="h-9 text-sm border-teal-200 bg-white"
            />
          </div>
          {apptDate && (
            <p className="text-xs text-teal-600 flex items-center gap-1.5">
              ⏰ Se enviarán recordatorios automáticos 24h y 2h antes vía cron-job.org
            </p>
          )}
        </div>
      )}

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

      <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800 font-semibold mt-2">
        <Send className="w-4 h-4 mr-2" />
        Guardar y Notificar
      </Button>
    </form>
  )
}

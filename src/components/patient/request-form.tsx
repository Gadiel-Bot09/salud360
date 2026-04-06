'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, UploadCloud, ShieldCheck, ChevronDown } from 'lucide-react'

// ─── Types (mirror form-builder.tsx) ─────────────────────────────────────────

export type FormFieldType = 'text' | 'email' | 'number' | 'date' | 'select' | 'file' | 'textarea'

export interface SubField {
  id: string
  label: string
  type: Exclude<FormFieldType, 'select'>
  required: boolean
  placeholder?: string
}

export interface ConditionalOption {
  value: string
  fields: SubField[]
}

export interface FormField {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  placeholder?: string
  options?: string[]
  hasConditionalOptions?: boolean
  conditionalOptions?: ConditionalOption[]
}

// ─── Sub-field Renderer ───────────────────────────────────────────────────────

function renderSubField(sub: SubField, parentFieldId: string) {
  // Name pattern: cond__{parentId}__{subId}  — extracted server-side
  const name = `cond__${parentFieldId}__${sub.id}`
  const base = 'flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700'

  return (
    <div key={sub.id} className="space-y-2">
      <Label className="flex items-center gap-1 font-medium text-slate-700">
        {sub.label} {sub.required && <span className="text-red-500">*</span>}
      </Label>
      {sub.type === 'text' && (
        <Input name={name} required={sub.required} placeholder={sub.placeholder} />
      )}
      {sub.type === 'textarea' && (
        <textarea
          name={name}
          required={sub.required}
          placeholder={sub.placeholder}
          rows={3}
          className={`${base} h-auto resize-none`}
        />
      )}
      {sub.type === 'email' && (
        <Input type="email" name={name} required={sub.required} placeholder={sub.placeholder} />
      )}
      {sub.type === 'number' && (
        <Input type="number" name={name} required={sub.required} placeholder={sub.placeholder} />
      )}
      {sub.type === 'date' && (
        <Input type="date" name={name} required={sub.required} />
      )}
      {sub.type === 'file' && (
        <div className="border-2 border-dashed border-slate-200 bg-white rounded-lg p-4 flex flex-col items-center text-center hover:bg-slate-50 transition-colors">
          <UploadCloud className="w-6 h-6 text-teal-500 mb-1" />
          <input
            type="file"
            name={name}
            required={sub.required}
            className="mt-2 block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
          />
        </div>
      )}
    </div>
  )
}

// ─── Single Dynamic Field Renderer ───────────────────────────────────────────

function DynamicField({ field }: { field: FormField }) {
  const [selectedOption, setSelectedOption] = useState<string>('')

  const isWide = field.type === 'file' || field.type === 'textarea'

  // Find sub-fields for the currently selected option
  const activeSubFields: SubField[] = field.hasConditionalOptions
    ? (field.conditionalOptions?.find((o) => o.value === selectedOption)?.fields ?? [])
    : []

  return (
    <>
      {/* Main field */}
      <div className={`space-y-2 ${isWide ? 'md:col-span-2' : ''}`}>
        <Label className="flex items-center gap-1 font-medium text-slate-700">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>

        {field.type === 'text' && (
          <Input name={field.id} required={field.required} placeholder={field.placeholder} />
        )}
        {field.type === 'textarea' && (
          <textarea
            name={field.id}
            required={field.required}
            placeholder={field.placeholder}
            rows={3}
            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 resize-none"
          />
        )}
        {field.type === 'email' && (
          <Input type="email" name={field.id} required={field.required} placeholder={field.placeholder} />
        )}
        {field.type === 'number' && (
          <Input type="number" name={field.id} required={field.required} placeholder={field.placeholder} />
        )}
        {field.type === 'date' && (
          <Input type="date" name={field.id} required={field.required} />
        )}

        {/* Simple select */}
        {field.type === 'select' && !field.hasConditionalOptions && field.options && (
          <div className="relative">
            <select
              name={field.id}
              required={field.required}
              className="flex h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="" disabled>Seleccione una opción...</option>
              {field.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        )}

        {/* Conditional select */}
        {field.type === 'select' && field.hasConditionalOptions && field.conditionalOptions && (
          <div className="relative">
            <select
              name={field.id}
              required={field.required}
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="flex h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="" disabled>Seleccione una opción...</option>
              {field.conditionalOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.value}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        )}

        {field.type === 'file' && (
          <div className="border-2 border-dashed border-slate-200 bg-white rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
            <UploadCloud className="w-8 h-8 text-teal-500 mb-2" />
            <span className="text-sm text-slate-500 font-medium mb-2">Arrastre un documento o haga clic</span>
            <input
              type="file"
              name={field.id}
              required={field.required}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>
        )}
      </div>

      {/* Conditional sub-fields — animate in when option is selected */}
      {activeSubFields.length > 0 && (
        <div className="md:col-span-2 rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            Información adicional — {selectedOption}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSubFields.map((sub) => renderSubField(sub, field.id))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Main Request Form ────────────────────────────────────────────────────────

export function RequestForm({
  institutionId,
  institutionName,
  fields,
}: {
  institutionId: string
  institutionName: string
  fields: FormField[]
}) {
  const [submitting, setSubmitting] = useState(false)
  const [successRadicado, setSuccessRadicado] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    formData.append('institutionId', institutionId)

    try {
      const res = await fetch('/api/requests/submit', { method: 'POST', body: formData })
      const result = await res.json()
      if (result.success) {
        setSuccessRadicado(result.radicado)
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fallo de Red', description: 'Imposible conectar con el servidor.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Success screen ───────────────────────────────────────────────────────

  if (successRadicado) {
    return (
      <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-4">
        <ShieldCheck className="w-20 h-20 text-teal-600 mb-4" />
        <h2 className="text-3xl font-bold text-slate-800">¡Solicitud Radicada!</h2>
        <p className="text-slate-600 max-w-sm">
          Su solicitud ha sido recibida por <b>{institutionName}</b>. Un correo de confirmación ha sido enviado.
        </p>
        <div className="bg-teal-50 border border-teal-200 py-4 px-8 rounded-xl font-mono tracking-widest text-2xl font-bold text-teal-800 my-4 shadow-sm">
          {successRadicado}
        </div>
        <p className="text-xs text-slate-400">Conserve este número para consultas futuras.</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-8 border-teal-200">
          Radicar Nueva Solicitud
        </Button>
      </div>
    )
  }

  // ─── Form ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in zoom-in-95 duration-500">

      {/* Section 1: Institution */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-800 border-b pb-2">1. Entidad Receptora</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-semibold text-slate-700">Institución</Label>
            <div className="flex h-11 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {institutionName}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-slate-700">Trámite a Solicitar *</Label>
            <div className="relative">
              <select
                name="requestType"
                required
                className="flex h-11 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="Cita Médica">Agendamiento de Cita Médica</option>
                <option value="Autorización">Autorización de Procedimientos</option>
                <option value="Fórmula">Renovación de Fórmula</option>
                <option value="PQR">PQR (Quejas / Reclamos)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Dynamic Clinical Form */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-800 border-b pb-2">2. Formulario Clínico</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border">

          {/* Fixed core fields */}
          <div className="space-y-2">
            <Label>Tipo de Identificación *</Label>
            <div className="relative">
              <select
                name="documentType"
                required
                className="flex h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="TI">Tarjeta de Identidad (TI)</option>
                <option value="PA">Pasaporte (PA)</option>
                <option value="RC">Registro Civil (RC)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Número de Identificación *</Label>
            <Input name="documentNumber" type="text" placeholder="Ej: 1102345678" required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Nombre Completo *</Label>
            <Input name="fullName" type="text" placeholder="Ej: Juan Carlos Pérez García" required />
          </div>
          <div className="space-y-2">
            <Label>Correo de Notificaciones *</Label>
            <Input name="email" type="email" placeholder="Para recibir su radicado por correo..." required />
          </div>
          <div className="space-y-2">
            <Label>Teléfono de Contacto</Label>
            <Input name="phone" type="tel" placeholder="Ej: 300 123 4567" />
          </div>

          {/* Dynamic fields from builder — each handles its own conditional sub-fields */}
          {fields && fields.map((field) => (
            <DynamicField key={field.id} field={field} />
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-4 border-t border-slate-200">
        <Button disabled={submitting} type="submit" className="w-full text-lg h-14 bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20">
          {submitting
            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generando Radicado Seguro...</>
            : 'Radicar Solicitud Médica'}
        </Button>
      </div>
    </form>
  )
}

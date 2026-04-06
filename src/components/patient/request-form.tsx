'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, UploadCloud, ShieldCheck, ChevronDown } from 'lucide-react'
import type { FormField, FormTemplate } from '@/lib/form-template'

// ─── Field Renderer ────────────────────────────────────────────────────────────

function FieldRenderer({ field, namePrefix }: { field: FormField; namePrefix?: string }) {
  const [selectedOption, setSelectedOption] = useState('')
  // Use systemRole as input name when available (binds to core DB columns)
  const inputName = namePrefix ? `${namePrefix}__${field.id}` : (field.systemRole || field.id)
  const base = 'flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 transition-colors'

  // Active sub-fields when this is a conditional select
  const activeSubFields = field.hasConditionalOptions
    ? (field.conditionalOptions?.find((o) => o.value === selectedOption)?.fields ?? [])
    : []

  const isWide = field.type === 'file' || field.type === 'textarea'

  return (
    <>
      <div className={`space-y-2 ${isWide ? 'md:col-span-2' : ''}`}>
        <Label className="flex items-center gap-1 font-medium text-slate-700 text-sm">
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </Label>

        {field.type === 'text' && <Input name={inputName} required={field.required} placeholder={field.placeholder} className="h-10" />}
        {field.type === 'email' && <Input type="email" name={inputName} required={field.required} placeholder={field.placeholder} className="h-10" />}
        {field.type === 'number' && <Input type="number" name={inputName} required={field.required} placeholder={field.placeholder} className="h-10" />}
        {field.type === 'date' && <Input type="date" name={inputName} required={field.required} className="h-10" />}

        {field.type === 'textarea' && (
          <textarea name={inputName} required={field.required} placeholder={field.placeholder} rows={3}
            className={`${base} h-auto resize-none`} />
        )}

        {/* Simple select */}
        {field.type === 'select' && !field.hasConditionalOptions && field.options && (
          <div className="relative">
            <select name={inputName} required={field.required}
              className={`${base} h-10 appearance-none pr-8`}>
              <option value="" disabled>Seleccione una opción...</option>
              {field.options.map((o, i) => <option key={i} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        )}

        {/* Conditional select */}
        {field.type === 'select' && field.hasConditionalOptions && field.conditionalOptions && (
          <div className="relative">
            <select name={inputName} required={field.required} value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className={`${base} h-10 appearance-none pr-8`}>
              <option value="" disabled>Seleccione una opción...</option>
              {field.conditionalOptions.map((o, i) => <option key={i} value={o.value}>{o.value}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        )}

        {field.type === 'file' && (
          <div className="border-2 border-dashed border-slate-200 bg-white rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
            <UploadCloud className="w-8 h-8 text-teal-500 mb-2" />
            <span className="text-sm text-slate-500 font-medium mb-2">Arrastre un documento o haga clic</span>
            <input type="file" name={inputName} required={field.required}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
          </div>
        )}
      </div>

      {/* Conditional sub-fields when an option is selected */}
      {activeSubFields.length > 0 && (
        <div className="md:col-span-2 rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Información adicional — {selectedOption}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSubFields.map((sub) => (
              <div key={sub.id} className="space-y-2">
                <Label className="flex items-center gap-1 font-medium text-slate-700 text-sm">
                  {sub.label}{sub.required && <span className="text-red-500">*</span>}
                </Label>
                {sub.type === 'text' && <Input name={`cond__${field.id}__${sub.id}`} required={sub.required} placeholder={sub.placeholder} />}
                {sub.type === 'email' && <Input type="email" name={`cond__${field.id}__${sub.id}`} required={sub.required} placeholder={sub.placeholder} />}
                {sub.type === 'number' && <Input type="number" name={`cond__${field.id}__${sub.id}`} required={sub.required} placeholder={sub.placeholder} />}
                {sub.type === 'date' && <Input type="date" name={`cond__${field.id}__${sub.id}`} required={sub.required} />}
                {sub.type === 'textarea' && (
                  <textarea name={`cond__${field.id}__${sub.id}`} required={sub.required} placeholder={sub.placeholder} rows={3}
                    className={`${base} h-auto resize-none`} />
                )}
                {sub.type === 'file' && (
                  <input type="file" name={`cond__${field.id}__${sub.id}`} required={sub.required}
                    className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Request Type Selector and Conditional Fields ─────────────────────────────

function RequestTypeSection({ template, onChange }: { template: FormTemplate; onChange: (typeLabel: string) => void }) {
  const [selectedId, setSelectedId] = useState('')
  const selectedType = template.requestTypes.find(rt => rt.id === selectedId)
  const base = 'flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 transition-colors'

  const handleChange = (id: string) => {
    setSelectedId(id)
    const label = template.requestTypes.find(rt => rt.id === id)?.label || ''
    onChange(label)
  }

  return (
    <>
      {/* Type selector */}
      <div className="space-y-2">
        <Label className="font-semibold text-slate-700 text-sm">Trámite a Solicitar <span className="text-red-500">*</span></Label>
        <div className="relative">
          <select name="requestType" required value={selectedId} onChange={(e) => handleChange(e.target.value)}
            className={`${base} h-11 appearance-none pr-8`}>
            <option value="" disabled>Seleccione el tipo de trámite...</option>
            {template.requestTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Conditional fields per type */}
      {selectedType && selectedType.conditionalFields.length > 0 && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
            Información requerida — {selectedType.label}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedType.conditionalFields.map(cf => (
              <FieldRenderer key={cf.id} field={cf} namePrefix={`rt__${selectedType.id}`} />
            ))}
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
  template,
}: {
  institutionId: string
  institutionName: string
  template: FormTemplate
}) {
  const [submitting, setSubmitting] = useState(false)
  const [successRadicado, setSuccessRadicado] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    formData.append('institutionId', institutionId)
    // Map requestType from ID to label (the select value is the label now)
    // Already done in RequestTypeSection via hidden onChange
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

  // ─── Success screen ──────────────────────────────────────────────────────────
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

  // ─── Form ────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="space-y-4">
        {/* Institution name (display only) */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-teal-700 text-xs font-bold">IPS</span>
          </div>
          <div>
            <p className="text-xs text-slate-500">Institución receptora</p>
            <p className="text-sm font-bold text-slate-800">{institutionName}</p>
          </div>
        </div>

        {/* Request type selector + conditional fields */}
        {template.requestTypes.length > 0 && (
          <RequestTypeSection template={template} onChange={() => {}} />
        )}
      </div>

      {/* All template fields (unified) */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-700 border-b border-slate-200 pb-2">Información del Solicitante</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {template.fields.map(field => (
            <FieldRenderer key={field.id} field={field} />
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <Button disabled={submitting} type="submit" className="w-full text-base h-13 py-4 bg-teal-700 hover:bg-teal-800 shadow-xl shadow-teal-600/20 font-semibold">
          {submitting
            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generando Radicado Seguro...</>
            : 'Radicar Solicitud Médica'}
        </Button>
      </div>
    </form>
  )
}

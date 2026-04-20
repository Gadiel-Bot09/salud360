'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, UploadCloud, ShieldCheck, ChevronDown, Building2, FileText, X } from 'lucide-react'
import type { FormField, FormTemplate } from '@/lib/form-template'

interface BrandColors {
  primary: string
  secondary: string
}

// ─── Single Labeled File Drop Zone ────────────────────────────────────────────
// Used when the admin has configured document labels (e.g. "Historia Clínica", "Autorización")

function LabeledFileZone({
  label, inputName, required, brandColors, multiple,
}: {
  label: string
  inputName: string
  required: boolean
  brandColors: BrandColors
  multiple?: boolean
}) {
  const [files, setFiles] = useState<File[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files))
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-1.5">
      {/* Tracks the human-readable label for this input in the API */}
      <input type="hidden" name={`filelabel__${inputName}`} value={label} />

      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
        <FileText className="h-3 w-3 opacity-60" /> {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </p>

      <label
        className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl border-2 border-dashed cursor-pointer hover:opacity-80 transition-all"
        style={{ borderColor: `${brandColors.primary}45`, background: `${brandColors.primary}07` }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${brandColors.primary}18` }}>
          <UploadCloud className="w-4 h-4" style={{ color: brandColors.primary }} />
        </div>
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          {multiple ? 'Clic o arrastre (múltiples archivos)' : 'Clic o arrastre un archivo'}
        </p>
        <input
          type="file"
          name={inputName}
          required={required && files.length === 0}
          multiple={multiple}
          onChange={handleChange}
          className="sr-only"
        />
      </label>

      {/* Preview list of selected files */}
      {files.length > 0 && (
        <ul className="space-y-1 mt-1">
          {files.map((f, i) => (
            <li key={i}
              className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 border"
              style={{ background: `${brandColors.primary}07`, borderColor: `${brandColors.primary}22` }}
            >
              <FileText className="h-3 w-3 shrink-0" style={{ color: brandColors.primary }} />
              <span className="truncate flex-1 text-slate-700 font-medium">{f.name}</span>
              <span className="text-slate-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="shrink-0 text-slate-300 hover:text-red-400 transition-colors ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Simple File Drop Zone ────────────────────────────────────────────────────
// Used when there are no labels — single or multiple based on allowMultipleFiles

function SimpleFileZone({
  inputName, required, brandColors, multiple,
}: {
  inputName: string
  required: boolean
  brandColors: BrandColors
  multiple?: boolean
}) {
  const [files, setFiles] = useState<File[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files))
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <label
        className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer hover:opacity-80 transition-all"
        style={{ borderColor: `${brandColors.primary}40`, background: `${brandColors.primary}06` }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: `${brandColors.primary}18` }}>
          <UploadCloud className="w-5 h-5" style={{ color: brandColors.primary }} />
        </div>
        <p className="text-sm text-slate-500 font-medium">Arrastre un documento o haga clic</p>
        {multiple && <p className="text-xs text-slate-400">Puede seleccionar múltiples archivos</p>}
        <input
          type="file"
          name={inputName}
          required={required && files.length === 0}
          multiple={multiple}
          onChange={handleChange}
          className="sr-only"
        />
      </label>

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={i}
              className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 border"
              style={{ background: `${brandColors.primary}07`, borderColor: `${brandColors.primary}22` }}
            >
              <FileText className="h-3 w-3 shrink-0" style={{ color: brandColors.primary }} />
              <span className="truncate flex-1 text-slate-700 font-medium">{f.name}</span>
              <span className="text-slate-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="shrink-0 text-slate-300 hover:text-red-400 transition-colors ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Field Renderer ────────────────────────────────────────────────────────────

function FieldRenderer({
  field, namePrefix, brandColors,
}: {
  field: FormField
  namePrefix?: string
  brandColors: BrandColors
}) {
  const [selectedOption, setSelectedOption] = useState('')
  const inputName = namePrefix ? `${namePrefix}__${field.id}` : (field.systemRole || field.id)
  const base = `flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors
    focus:outline-none focus:ring-2 focus:border-transparent`

  const activeSubFields = field.hasConditionalOptions
    ? (field.conditionalOptions?.find((o) => o.value === selectedOption)?.fields ?? [])
    : []

  const isWide = field.type === 'file' || field.type === 'textarea'

  // When admin has defined document labels, options[] holds them (e.g. ["Historia Clínica", "Autorización"])
  const fileLabels = field.type === 'file' && field.options && field.options.length > 0
    ? field.options.filter(Boolean)
    : []

  return (
    <>
      <input type="hidden" name={`label__${inputName}`} value={field.label} />
      <div className={`space-y-2 ${isWide ? 'md:col-span-2' : ''}`}>
        <Label className="flex items-center gap-1 font-medium text-slate-700 text-sm">
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </Label>

        {field.type === 'text' && (
          <Input
            name={inputName} required={field.required} placeholder={field.placeholder}
            className="h-10"
            style={{ '--tw-ring-color': brandColors.primary } as React.CSSProperties}
          />
        )}
        {field.type === 'email' && (
          <Input
            type="email" name={inputName} required={field.required} placeholder={field.placeholder}
            className="h-10"
            style={{ '--tw-ring-color': brandColors.primary } as React.CSSProperties}
          />
        )}
        {field.type === 'number' && (
          <Input
            type="number" name={inputName} required={field.required} placeholder={field.placeholder}
            className="h-10"
            style={{ '--tw-ring-color': brandColors.primary } as React.CSSProperties}
          />
        )}
        {field.type === 'date' && (
          <Input
            type="date" name={inputName} required={field.required}
            className="h-10"
            style={{ '--tw-ring-color': brandColors.primary } as React.CSSProperties}
          />
        )}

        {field.type === 'textarea' && (
          <textarea
            name={inputName} required={field.required} placeholder={field.placeholder} rows={3}
            className={`${base} h-auto resize-none focus:ring-2`}
            style={{ '--tw-ring-color': brandColors.primary } as React.CSSProperties}
          />
        )}

        {/* Simple select */}
        {field.type === 'select' && !field.hasConditionalOptions && field.options && (
          <div className="relative">
            <select
              name={inputName} required={field.required}
              className={`${base} h-10 appearance-none pr-8`}
              style={{ '--tw-ring-color': brandColors.primary } as React.CSSProperties}
            >
              <option value="" disabled>Seleccione una opción...</option>
              {field.options.map((o, i) => <option key={i} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        )}

        {/* Conditional select */}
        {field.type === 'select' && field.hasConditionalOptions && field.conditionalOptions && (
          <div className="relative">
            <select
              name={inputName} required={field.required} value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className={`${base} h-10 appearance-none pr-8`}
            >
              <option value="" disabled>Seleccione una opción...</option>
              {field.conditionalOptions.map((o, i) => <option key={i} value={o.value}>{o.value}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        )}

        {/* ── File field — THREE modes ─────────────────────────────────────────
            1. Labels defined → one LabeledFileZone per label (separate inputs)
            2. allowMultipleFiles, no labels → SimpleFileZone with multiple
            3. No labels, no multiple → SimpleFileZone single
        ────────────────────────────────────────────────────────────────────── */}
        {field.type === 'file' && fileLabels.length > 0 && (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Documentos requeridos
            </p>
            {fileLabels.map((lbl, idx) => (
              <LabeledFileZone
                key={idx}
                label={lbl}
                inputName={`${inputName}__lbl${idx}`}
                required={field.required}
                brandColors={brandColors}
                multiple={field.allowMultipleFiles}
              />
            ))}
          </div>
        )}

        {field.type === 'file' && fileLabels.length === 0 && (
          <SimpleFileZone
            inputName={inputName}
            required={field.required}
            brandColors={brandColors}
            multiple={field.allowMultipleFiles}
          />
        )}
      </div>

      {/* Conditional sub-fields when an option is selected */}
      {activeSubFields.length > 0 && (
        <div
          className="md:col-span-2 rounded-xl border p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ borderColor: `${brandColors.primary}30`, background: `${brandColors.primary}08` }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: brandColors.primary }}>
            Información adicional — {selectedOption}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSubFields.map((sub) => (
              <div key={sub.id} className="space-y-2">
                <input type="hidden" name={`label__cond__${field.id}__${sub.id}`} value={`${field.label} - ${sub.label}`} />
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
                  <SimpleFileZone
                    inputName={`cond__${field.id}__${sub.id}`}
                    required={sub.required}
                    brandColors={brandColors}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Request Type Selector ─────────────────────────────────────────────────────

function RequestTypeSection({
  template, onChange, brandColors,
}: {
  template: FormTemplate
  onChange: (typeLabel: string) => void
  brandColors: BrandColors
}) {
  const [selectedId, setSelectedId] = useState('')
  const selectedType = template.requestTypes.find(rt => rt.id === selectedId)
  const selectedLabel = selectedType?.label || ''

  const handleChange = (id: string) => {
    setSelectedId(id)
    const label = template.requestTypes.find(rt => rt.id === id)?.label || ''
    onChange(label)
  }

  const base = `flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors
    focus:outline-none focus:ring-2 focus:border-transparent`

  return (
    <>
      <input type="hidden" name="requestType" value={selectedLabel} />
      <div className="space-y-2">
        <Label className="font-semibold text-slate-700 text-sm">
          Trámite a Solicitar <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <select
            name="_requestTypeId"
            required
            value={selectedId}
            onChange={(e) => handleChange(e.target.value)}
            className={`${base} h-11 appearance-none pr-8`}
            style={{ '--tw-ring-color': brandColors.primary } as React.CSSProperties}
          >
            <option value="" disabled>Seleccione el tipo de trámite...</option>
            {template.requestTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {selectedType && selectedType.conditionalFields.length > 0 && (
        <div
          className="rounded-xl border p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ borderColor: `${brandColors.primary}30`, background: `${brandColors.primary}08` }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
            style={{ color: brandColors.primary }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: brandColors.primary }} />
            Información requerida — {selectedType.label}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedType.conditionalFields.map(cf => (
              <FieldRenderer key={cf.id} field={cf} namePrefix={`rt__${selectedType.id}`} brandColors={brandColors} />
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
  institutionLogoUrl,
  template,
  brandColors: externalColors,
}: {
  institutionId: string
  institutionName: string
  institutionLogoUrl?: string
  template: FormTemplate
  brandColors?: BrandColors
}) {
  const [submitting, setSubmitting] = useState(false)
  const [successRadicado, setSuccessRadicado] = useState<string | null>(null)
  const { toast } = useToast()

  const brandColors: BrandColors = externalColors ?? { primary: '#0f766e', secondary: '#134e4a' }
  const initial = institutionName?.charAt(0)?.toUpperCase() || 'I'

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

  // ─── Success screen ────────────────────────────────────────────────────────
  if (successRadicado) {
    return (
      <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-4">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl mb-2"
          style={{ background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})` }}
        >
          <ShieldCheck className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800">¡Solicitud Radicada!</h2>
        <p className="text-slate-600 max-w-sm">
          Su solicitud ha sido recibida por <b>{institutionName}</b>. Un correo de confirmación ha sido enviado.
        </p>
        <div
          className="border py-4 px-8 rounded-xl font-mono tracking-widest text-2xl font-bold my-4 shadow-sm"
          style={{
            background: `${brandColors.primary}10`,
            borderColor: `${brandColors.primary}30`,
            color: brandColors.primary,
          }}
        >
          {successRadicado}
        </div>
        <p className="text-xs text-slate-400">Conserve este número para consultas futuras.</p>
        <Button
          variant="outline" onClick={() => window.location.reload()}
          className="mt-8"
          style={{ borderColor: `${brandColors.primary}40`, color: brandColors.primary }}
        >
          Radicar Nueva Solicitud
        </Button>
      </div>
    )
  }

  // ─── Form ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="space-y-4">
        {/* Institution badge */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl border"
          style={{ background: `${brandColors.primary}08`, borderColor: `${brandColors.primary}25` }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: `${brandColors.primary}20` }}
          >
            {institutionLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={institutionLogoUrl} alt={institutionName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-sm" style={{ color: brandColors.primary }}>{initial}</span>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">Institución receptora</p>
            <p className="text-sm font-bold text-slate-800">{institutionName}</p>
          </div>
          <div className="ml-auto">
            <Building2 className="h-4 w-4 text-slate-300" />
          </div>
        </div>

        {/* Request type selector + conditional fields */}
        {template.requestTypes.length > 0 && (
          <RequestTypeSection template={template} onChange={() => {}} brandColors={brandColors} />
        )}
      </div>

      {/* All template fields */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: brandColors.primary }} />
          <h3 className="text-base font-semibold text-slate-700">Información del Solicitante</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {template.fields.map(field => (
            <FieldRenderer key={field.id} field={field} brandColors={brandColors} />
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-base font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: submitting
              ? `${brandColors.primary}80`
              : `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%)`,
          }}
        >
          {submitting
            ? <><Loader2 className="h-5 w-5 animate-spin" /> Generando Radicado Seguro...</>
            : 'Radicar Solicitud Médica'}
        </button>
      </div>
    </form>
  )
}

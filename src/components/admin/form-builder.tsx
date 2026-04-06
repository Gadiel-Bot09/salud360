'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  Trash2, Plus, ArrowUp, ArrowDown, Save, Loader2,
  ChevronDown, ChevronRight, GitBranch, X
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormFieldType = 'text' | 'email' | 'number' | 'date' | 'select' | 'file' | 'textarea'

/** A leaf field that lives inside a conditional option (cannot itself be conditional) */
export interface SubField {
  id: string
  label: string
  type: Exclude<FormFieldType, 'select'>
  required: boolean
  placeholder?: string
}

/** One option of a conditional select, plus the sub-fields it activates */
export interface ConditionalOption {
  value: string       // The option label / value shown to the patient
  fields: SubField[]  // Fields that appear when this option is chosen
}

/** Top-level form field */
export interface FormField {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  placeholder?: string
  // Simple select (comma list)
  options?: string[]
  // Conditional select
  hasConditionalOptions?: boolean
  conditionalOptions?: ConditionalOption[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Texto Corto',
  email: 'Correo Electrónico',
  number: 'Número',
  date: 'Fecha',
  select: 'Lista Desplegable',
  file: 'Archivo',
  textarea: 'Texto Largo',
}

const SUB_FIELD_TYPES: Array<{ value: Exclude<FormFieldType, 'select'>; label: string }> = [
  { value: 'text', label: 'Texto Corto' },
  { value: 'textarea', label: 'Texto Largo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'file', label: 'Archivo' },
  { value: 'email', label: 'Correo' },
]

function newSubField(): SubField {
  return { id: crypto.randomUUID(), label: 'Nuevo Sub-campo', type: 'text', required: false, placeholder: '' }
}

// ─── Sub-field Editor ─────────────────────────────────────────────────────────

function SubFieldEditor({
  sub,
  onUpdate,
  onRemove,
}: {
  sub: SubField
  onUpdate: (updates: Partial<SubField>) => void
  onRemove: () => void
}) {
  return (
    <div className="flex gap-3 items-start bg-white border border-slate-200 rounded-lg p-3 group">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Etiqueta</Label>
          <Input
            value={sub.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Tipo</Label>
          <select
            value={sub.type}
            onChange={(e) => onUpdate({ type: e.target.value as SubField['type'] })}
            className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
          >
            {SUB_FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Placeholder</Label>
          <Input
            value={sub.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            placeholder="Texto de ayuda..."
            className="h-8 text-sm"
            disabled={sub.type === 'file' || sub.type === 'date'}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-5">
        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
          <Checkbox
            checked={sub.required}
            onCheckedChange={(v) => onUpdate({ required: !!v })}
            className="h-3.5 w-3.5"
          />
          Obligatorio
        </label>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Conditional Option Panel ─────────────────────────────────────────────────

function ConditionalOptionPanel({
  opt,
  index,
  onUpdateValue,
  onAddSubField,
  onUpdateSubField,
  onRemoveSubField,
  onRemoveOption,
}: {
  opt: ConditionalOption
  index: number
  onUpdateValue: (val: string) => void
  onAddSubField: () => void
  onUpdateSubField: (subIdx: number, updates: Partial<SubField>) => void
  onRemoveSubField: (subIdx: number) => void
  onRemoveOption: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Option Header */}
      <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-600"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-6">#{index + 1}</span>
        <Input
          value={opt.value}
          onChange={(e) => onUpdateValue(e.target.value)}
          placeholder="Nombre de la opción (ej: Cita de Primera Vez)"
          className="flex-1 h-8 text-sm font-medium border-slate-300"
        />
        <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5 shrink-0">
          {opt.fields.length} sub-campo{opt.fields.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
          onClick={onRemoveOption}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Sub-fields */}
      {expanded && (
        <div className="p-4 space-y-3 bg-slate-50/50">
          {opt.fields.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-3 italic">
              Esta opción no activa ningún campo adicional. Agrégale sub-campos abajo.
            </p>
          )}
          {opt.fields.map((sub, si) => (
            <SubFieldEditor
              key={sub.id}
              sub={sub}
              onUpdate={(updates) => onUpdateSubField(si, updates)}
              onRemove={() => onRemoveSubField(si)}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddSubField}
            className="w-full border-dashed border-teal-300 text-teal-700 hover:bg-teal-50 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Añadir sub-campo para esta opción
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Main FormBuilder ─────────────────────────────────────────────────────────

interface FormBuilderProps {
  initialFields: FormField[]
  templateId: string | null
  institutionId: string
  onSave: (fields: FormField[], name: string, institutionId: string) => Promise<{ success: boolean; error?: string }>
}

export function FormBuilder({ initialFields, templateId, institutionId, onSave }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(initialFields)
  const [templateName, setTemplateName] = useState('Formulario Base Pacientes')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // ── Field-level helpers ──────────────────────────────────────────────────

  const addField = () => {
    setFields([...fields, {
      id: crypto.randomUUID(),
      label: 'Nuevo Campo',
      type: 'text',
      required: false,
      placeholder: '',
    }])
  }

  const updateField = (i: number, updates: Partial<FormField>) => {
    const next = [...fields]
    next[i] = { ...next[i], ...updates }
    setFields(next)
  }

  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i))

  const moveField = (i: number, dir: 'up' | 'down') => {
    if ((dir === 'up' && i === 0) || (dir === 'down' && i === fields.length - 1)) return
    const next = [...fields]
    const swap = dir === 'up' ? i - 1 : i + 1;
    [next[i], next[swap]] = [next[swap], next[i]]
    setFields(next)
  }

  // Toggle between simple select and conditional select
  const toggleConditional = (i: number, enable: boolean) => {
    const field = fields[i]
    if (enable) {
      // Convert existing simple options to conditional options (with empty sub-fields)
      const currentOpts = field.options || []
      const conditionalOptions: ConditionalOption[] = currentOpts.length > 0
        ? currentOpts.map((v) => ({ value: v, fields: [] }))
        : [{ value: 'Opción 1', fields: [] }]
      updateField(i, { hasConditionalOptions: true, conditionalOptions, options: undefined })
    } else {
      // Convert back: extract just the values as simple options
      const opts = (field.conditionalOptions || []).map((o) => o.value)
      updateField(i, { hasConditionalOptions: false, conditionalOptions: undefined, options: opts })
    }
  }

  // ── Conditional option helpers ───────────────────────────────────────────

  const addConditionalOption = (fieldIdx: number) => {
    const opts = [...(fields[fieldIdx].conditionalOptions || [])]
    opts.push({ value: `Opción ${opts.length + 1}`, fields: [] })
    updateField(fieldIdx, { conditionalOptions: opts })
  }

  const updateOptionValue = (fieldIdx: number, optIdx: number, value: string) => {
    const opts = [...(fields[fieldIdx].conditionalOptions || [])]
    opts[optIdx] = { ...opts[optIdx], value }
    updateField(fieldIdx, { conditionalOptions: opts })
  }

  const removeOption = (fieldIdx: number, optIdx: number) => {
    const opts = (fields[fieldIdx].conditionalOptions || []).filter((_, i) => i !== optIdx)
    updateField(fieldIdx, { conditionalOptions: opts })
  }

  // ── Sub-field helpers ────────────────────────────────────────────────────

  const addSubField = (fieldIdx: number, optIdx: number) => {
    const opts = [...(fields[fieldIdx].conditionalOptions || [])]
    opts[optIdx] = { ...opts[optIdx], fields: [...opts[optIdx].fields, newSubField()] }
    updateField(fieldIdx, { conditionalOptions: opts })
  }

  const updateSubField = (fieldIdx: number, optIdx: number, subIdx: number, updates: Partial<SubField>) => {
    const opts = [...(fields[fieldIdx].conditionalOptions || [])]
    const subFields = [...opts[optIdx].fields]
    subFields[subIdx] = { ...subFields[subIdx], ...updates }
    opts[optIdx] = { ...opts[optIdx], fields: subFields }
    updateField(fieldIdx, { conditionalOptions: opts })
  }

  const removeSubField = (fieldIdx: number, optIdx: number, subIdx: number) => {
    const opts = [...(fields[fieldIdx].conditionalOptions || [])]
    opts[optIdx] = { ...opts[optIdx], fields: opts[optIdx].fields.filter((_, i) => i !== subIdx) }
    updateField(fieldIdx, { conditionalOptions: opts })
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setLoading(true)
    const result = await onSave(fields, templateName, institutionId)
    setLoading(false)
    if (result.success) {
      toast({ title: 'Plantilla Guardada', description: 'El formulario ha sido actualizado.', className: 'bg-green-50' })
    } else {
      toast({ title: 'Error al Guardar', description: result.error, variant: 'destructive' })
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header toolbar */}
      <Card className="border-slate-200">
        <CardContent className="pt-6 flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="w-full md:w-1/2 space-y-2">
            <Label htmlFor="formName">Nombre de la Plantilla</Label>
            <Input id="formName" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={loading} className="bg-teal-700 hover:bg-teal-800">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Publicar Cambios
          </Button>
        </CardContent>
      </Card>

      {/* Fields list */}
      <div className="space-y-4">
        {fields.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
            <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No hay campos en esta plantilla.</p>
            <Button onClick={addField} variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
              <Plus className="w-4 h-4 mr-2" /> Añadir Primer Campo
            </Button>
          </div>
        ) : (
          fields.map((field, fi) => (
            <Card key={field.id} className="border-slate-200 shadow-sm hover:border-teal-200 transition-colors">
              <CardContent className="p-4 sm:p-6 flex gap-4 flex-col md:flex-row md:items-start">

                {/* Order controls */}
                <div className="flex flex-row md:flex-col items-center justify-center gap-1 text-slate-400 bg-slate-50 p-1 rounded shrink-0">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(fi, 'up')} disabled={fi === 0}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-bold w-4 text-center">{fi + 1}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(fi, 'down')} disabled={fi === fields.length - 1}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>

                {/* Field config */}
                <div className="flex-1 space-y-4 w-full">

                  {/* Row 1: label, type, placeholder */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500 uppercase">Etiqueta</Label>
                      <Input value={field.label} onChange={(e) => updateField(fi, { label: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500 uppercase">Tipo de Campo</Label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(fi, { type: e.target.value as FormFieldType })}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                      >
                        {(Object.entries(FIELD_TYPE_LABELS) as [FormFieldType, string][]).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500 uppercase">Placeholder</Label>
                      <Input
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(fi, { placeholder: e.target.value })}
                        placeholder="Ej: Ingresa tu número..."
                        disabled={['select', 'file', 'date'].includes(field.type)}
                      />
                    </div>
                  </div>

                  {/* Select configuration */}
                  {field.type === 'select' && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">

                      {/* Toggle header */}
                      <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-teal-600" />
                          <span className="text-sm font-semibold text-slate-700">Opciones del Desplegable</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={!!field.hasConditionalOptions}
                            onCheckedChange={(v) => toggleConditional(fi, !!v)}
                            id={`cond-${field.id}`}
                          />
                          <span className="text-xs font-medium text-slate-600">Activar sub-campos condicionales</span>
                        </label>
                      </div>

                      <div className="p-4">
                        {!field.hasConditionalOptions ? (
                          /* ── Simple options ── */
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Opciones (separadas por coma)</Label>
                            <Input
                              placeholder="Medicina General, Pediatría, Odontología"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => {
                                const opts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                                updateField(fi, { options: opts })
                              }}
                            />
                          </div>
                        ) : (
                          /* ── Conditional options ── */
                          <div className="space-y-3">
                            {(field.conditionalOptions || []).map((opt, oi) => (
                              <ConditionalOptionPanel
                                key={oi}
                                opt={opt}
                                index={oi}
                                onUpdateValue={(val) => updateOptionValue(fi, oi, val)}
                                onAddSubField={() => addSubField(fi, oi)}
                                onUpdateSubField={(si, updates) => updateSubField(fi, oi, si, updates)}
                                onRemoveSubField={(si) => removeSubField(fi, oi, si)}
                                onRemoveOption={() => removeOption(fi, oi)}
                              />
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addConditionalOption(fi)}
                              className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" /> Añadir opción
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Required toggle */}
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id={`req-${field.id}`}
                      checked={field.required}
                      onCheckedChange={(v) => updateField(fi, { required: !!v })}
                    />
                    <Label htmlFor={`req-${field.id}`} className="text-sm cursor-pointer">
                      Campo obligatorio
                    </Label>
                  </div>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 self-start"
                  onClick={() => removeField(fi)}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {fields.length > 0 && (
        <div className="flex justify-center border-t border-dashed border-slate-300 pt-6">
          <Button onClick={addField} variant="outline" className="border-teal-200 bg-white text-teal-700 hover:bg-teal-50 shadow-sm rounded-full px-8">
            <Plus className="w-4 h-4 mr-2" /> Añadir Otro Campo
          </Button>
        </div>
      )}
    </div>
  )
}

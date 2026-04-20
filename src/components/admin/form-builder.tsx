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
  ChevronDown, ChevronRight, GitBranch, X, Eye, EyeOff,
  Shield, Layers, ClipboardList, UploadCloud
} from 'lucide-react'

// Import types and utilities from the shared neutral module (NO 'use client')
// Server files MUST import directly from '@/lib/form-template' — NOT from here.
import type { FormFieldType, SystemRole, SubField, FormField, RequestType, FormTemplate } from '@/lib/form-template'
import { DEFAULT_TEMPLATE, parseTemplate } from '@/lib/form-template'

// Re-export for convenience of client-side consumers
export type { FormFieldType, SystemRole, SubField, ConditionalOption, FormField, RequestType, FormTemplate } from '@/lib/form-template'
export { DEFAULT_TEMPLATE, parseTemplate } from '@/lib/form-template'

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Texto Corto',
  email: 'Correo Electrónico',
  number: 'Número',
  date: 'Fecha',
  select: 'Lista Desplegable',
  file: 'Archivo',
  textarea: 'Texto Largo',
}

const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  documentType: 'Tipo de Documento',
  documentNumber: 'N° de Documento',
  fullName: 'Nombre del Paciente',
  email: 'Correo de Notificación',
  phone: 'Teléfono',
}

const SUB_FIELD_TYPES: Array<{ value: Exclude<FormFieldType, 'select'>; label: string }> = [
  { value: 'text', label: 'Texto Corto' },
  { value: 'textarea', label: 'Texto Largo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'file', label: 'Archivo' },
  { value: 'email', label: 'Correo' },
]

// ─── Sub-field Editor ──────────────────────────────────────────────────────────

function SubFieldEditor({ sub, onUpdate, onRemove }: {
  sub: SubField
  onUpdate: (u: Partial<SubField>) => void
  onRemove: () => void
}) {
  return (
    <div className="flex gap-3 items-start bg-white border border-slate-200 rounded-lg p-3 group">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Etiqueta</Label>
          <Input value={sub.label} onChange={(e) => onUpdate({ label: e.target.value })} className="h-8 text-sm" placeholder="Nombre del campo..." />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Tipo</Label>
          <select value={sub.type} onChange={(e) => onUpdate({ type: e.target.value as SubField['type'] })} className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700">
            {SUB_FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Placeholder</Label>
          <Input value={sub.placeholder || ''} onChange={(e) => onUpdate({ placeholder: e.target.value })} className="h-8 text-sm" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-5">
        <div className="flex items-center gap-1">
          <Checkbox checked={sub.required} onCheckedChange={(v) => onUpdate({ required: !!v })} id={`sub-req-${sub.id}`} />
          <label htmlFor={`sub-req-${sub.id}`} className="text-xs text-slate-500 cursor-pointer">*</label>
        </div>
        <button onClick={onRemove} className="text-slate-300 hover:text-red-500 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Field Card ────────────────────────────────────────────────────────────────

function FieldCard({
  field, isFirst, isLast, allowConditional = true,
  onUpdate, onRemove, onMoveUp, onMoveDown
}: {
  field: FormField
  isFirst: boolean
  isLast: boolean
  allowConditional?: boolean
  onUpdate: (u: Partial<FormField>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [condExpanded, setCondExpanded] = useState(false)
  const isSystem = !!field.systemRole

  const addOption = () => onUpdate({ options: [...(field.options || []), ''] })
  const updateOption = (i: number, v: string) => {
    const opts = [...(field.options || [])]
    opts[i] = v; onUpdate({ options: opts })
  }
  const removeOption = (i: number) => onUpdate({ options: (field.options || []).filter((_, j) => j !== i) })

  const addConditionalOption = () => {
    const opts = [...(field.conditionalOptions || []), { value: '', fields: [] }]
    onUpdate({ conditionalOptions: opts })
  }
  const updateConditionalOption = (i: number, value: string) => {
    const opts = [...(field.conditionalOptions || [])]
    opts[i] = { ...opts[i], value }; onUpdate({ conditionalOptions: opts })
  }
  const removeConditionalOption = (i: number) => onUpdate({ conditionalOptions: (field.conditionalOptions || []).filter((_, j) => j !== i) })

  const addSubField = (optIdx: number) => {
    const opts = [...(field.conditionalOptions || [])]
    opts[optIdx] = { ...opts[optIdx], fields: [...opts[optIdx].fields, { id: crypto.randomUUID(), label: '', type: 'text', required: false, placeholder: '' }] }
    onUpdate({ conditionalOptions: opts })
  }
  const updateSubField = (optIdx: number, subIdx: number, u: Partial<SubField>) => {
    const opts = [...(field.conditionalOptions || [])]
    const subs = [...opts[optIdx].fields]; subs[subIdx] = { ...subs[subIdx], ...u }
    opts[optIdx] = { ...opts[optIdx], fields: subs }; onUpdate({ conditionalOptions: opts })
  }
  const removeSubField = (optIdx: number, subIdx: number) => {
    const opts = [...(field.conditionalOptions || [])]
    opts[optIdx] = { ...opts[optIdx], fields: opts[optIdx].fields.filter((_, i) => i !== subIdx) }
    onUpdate({ conditionalOptions: opts })
  }

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${isSystem ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}>
      {/* Card Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={() => setExpanded(!expanded)} className="flex-1 flex items-center gap-2 text-left min-w-0">
          {expanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
          <span className="text-sm font-semibold text-slate-700 truncate">{field.label || <span className="text-slate-400 italic">Sin etiqueta</span>}</span>
          <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 shrink-0">{FIELD_TYPE_LABELS[field.type]}</span>
          {field.required && <span className="text-[10px] text-red-500 font-bold">*</span>}
          {isSystem && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 border border-indigo-200 shrink-0">
              <Shield className="h-2.5 w-2.5" />{SYSTEM_ROLE_LABELS[field.systemRole!]}
            </span>
          )}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button disabled={isFirst} onClick={onMoveUp} className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button disabled={isLast} onClick={onMoveDown} className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button onClick={onRemove} className="p-1 text-slate-300 hover:text-red-500 transition-colors ml-1"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Expanded Editor */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Label */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Etiqueta del campo</Label>
              <Input value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} placeholder="Ej: Especialidad médica..." className="h-9" />
            </div>
            {/* Type — locked for system fields */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Tipo de campo {isSystem && <span className="text-indigo-500">(bloqueado)</span>}</Label>
              <select disabled={isSystem} value={field.type} onChange={(e) => onUpdate({ type: e.target.value as FormFieldType, options: undefined, hasConditionalOptions: false, conditionalOptions: undefined })}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 disabled:bg-slate-50 disabled:text-slate-400">
                {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {/* Placeholder */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Texto de ayuda (placeholder)</Label>
              <Input value={field.placeholder || ''} onChange={(e) => onUpdate({ placeholder: e.target.value })} placeholder="Ej: Escriba aquí..." className="h-9" />
            </div>
            {/* Required */}
            <div className="flex items-center gap-2 pt-5">
              <Checkbox checked={field.required} onCheckedChange={(v) => onUpdate({ required: !!v })} id={`req-${field.id}`} />
              <label htmlFor={`req-${field.id}`} className="text-sm font-medium text-slate-700 cursor-pointer">Campo obligatorio</label>
            </div>
          </div>

          {/* Allow multiple files checkbox */}
          {field.type === 'file' && (
            <div className="flex items-center gap-2 pt-2 pb-2">
              <Checkbox checked={field.allowMultipleFiles} onCheckedChange={(v) => onUpdate({ allowMultipleFiles: !!v })} id={`req-mult-${field.id}`} />
              <label htmlFor={`req-mult-${field.id}`} className="text-sm font-medium text-slate-700 cursor-pointer">Permitir subir múltiples archivos</label>
            </div>
          )}

          {/* Simple options for simple select OR file tags */}
          {((field.type === 'select' && !field.hasConditionalOptions) || field.type === 'file') && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-500 uppercase tracking-wider">
                {field.type === 'file' ? 'Etiquetas de documento (opcional)' : 'Opciones de la lista'}
              </Label>
              {(field.options || []).map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={opt} onChange={(e) => updateOption(i, e.target.value)} className="h-8 text-sm flex-1" placeholder={field.type === 'file' ? `Ej: Historia Clínica` : `Opción ${i + 1}`} />
                  <button onClick={() => removeOption(i)} className="text-slate-300 hover:text-red-500"><X className="h-4 w-4" /></button>
                </div>
              ))}
              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm" onClick={addOption} className="text-xs h-8">
                  <Plus className="h-3 w-3 mr-1" /> {field.type === 'file' ? 'Agregar etiqueta' : 'Agregar opción'}
                </Button>
                {allowConditional && field.type !== 'file' && (
                  <Button type="button" variant="outline" size="sm" onClick={() => onUpdate({ hasConditionalOptions: true, options: undefined })} className="text-xs h-8 border-violet-200 text-violet-700 hover:bg-violet-50">
                    <GitBranch className="h-3 w-3 mr-1" /> Convertir a opciones con subcampos
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Conditional options */}
          {field.type === 'select' && field.hasConditionalOptions && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button onClick={() => setCondExpanded(!condExpanded)} className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                  <GitBranch className="h-4 w-4" />
                  Opciones con Subcampos Condicionales
                  {condExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <span className="text-xs bg-violet-100 text-violet-600 rounded-full px-2 py-0.5">{field.conditionalOptions?.length || 0} opciones</span>
                </button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onUpdate({ hasConditionalOptions: false, conditionalOptions: undefined, options: [] })} className="text-xs text-slate-400 h-7">
                  <X className="h-3 w-3 mr-1" /> Simplificar
                </Button>
              </div>
              {condExpanded && (
                <div className="space-y-4 pl-4 border-l-2 border-violet-200">
                  {(field.conditionalOptions || []).map((opt, optIdx) => (
                    <div key={optIdx} className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-3">
                      <div className="flex gap-2 items-center">
                        <Input value={opt.value} onChange={(e) => updateConditionalOption(optIdx, e.target.value)} className="h-8 text-sm flex-1 bg-white" placeholder="Nombre de la opción..." />
                        <button onClick={() => removeConditionalOption(optIdx)} className="text-slate-300 hover:text-red-500"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="space-y-2">
                        {opt.fields.map((sub, subIdx) => (
                          <SubFieldEditor key={sub.id} sub={sub}
                            onUpdate={(u) => updateSubField(optIdx, subIdx, u)}
                            onRemove={() => removeSubField(optIdx, subIdx)} />
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => addSubField(optIdx)} className="text-xs h-7 w-full border-dashed">
                          <Plus className="h-3 w-3 mr-1" /> Agregar subcampo para &quot;{opt.value || 'esta opción'}&quot;
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addConditionalOption} className="text-xs h-8 border-violet-300 text-violet-700">
                    <Plus className="h-3 w-3 mr-1" /> Nueva opción condicional
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Request Type Card ────────────────────────────────────────────────────────

function RequestTypeCard({
  type, isFirst, isLast,
  onUpdate, onRemove, onMoveUp, onMoveDown
}: {
  type: RequestType
  isFirst: boolean; isLast: boolean
  onUpdate: (u: Partial<RequestType>) => void
  onRemove: () => void
  onMoveUp: () => void; onMoveDown: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const addConditionalField = () => {
    onUpdate({ conditionalFields: [...type.conditionalFields, { id: crypto.randomUUID(), label: '', type: 'text', required: false, placeholder: '' }] })
  }
  const updateCF = (i: number, u: Partial<FormField>) => {
    const cf = [...type.conditionalFields]; cf[i] = { ...cf[i], ...u }; onUpdate({ conditionalFields: cf })
  }
  const removeCF = (i: number) => onUpdate({ conditionalFields: type.conditionalFields.filter((_, j) => j !== i) })
  const moveCF = (i: number, dir: -1 | 1) => {
    const cf = [...type.conditionalFields]; const j = i + dir
    if (j < 0 || j >= cf.length) return;
    [cf[i], cf[j]] = [cf[j], cf[i]]; onUpdate({ conditionalFields: cf })
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={() => setExpanded(!expanded)} className="flex-1 flex items-center gap-2 text-left min-w-0">
          {expanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
          <span className="text-sm font-semibold text-slate-700 truncate">{type.label || <span className="text-slate-400 italic">Sin nombre</span>}</span>
          <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 border border-amber-200 shrink-0">
            {type.conditionalFields.length > 0 ? `${type.conditionalFields.length} campo${type.conditionalFields.length !== 1 ? 's' : ''} adicionale${type.conditionalFields.length !== 1 ? 's' : ''}` : 'Sin campos adicionales'}
          </span>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button disabled={isFirst} onClick={onMoveUp} className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button disabled={isLast} onClick={onMoveDown} className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button onClick={onRemove} className="p-1 text-slate-300 hover:text-red-500 ml-1"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-amber-100 pt-4 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Nombre del trámite</Label>
            <Input value={type.label} onChange={(e) => onUpdate({ label: e.target.value })} placeholder="Ej: Agendamiento de Cita Médica" className="h-9" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campos adicionales que aparecen al seleccionar este trámite</p>
            {type.conditionalFields.map((cf, i) => (
              <FieldCard key={cf.id} field={cf} isFirst={i === 0} isLast={i === type.conditionalFields.length - 1}
                allowConditional={false}
                onUpdate={(u) => updateCF(i, u)}
                onRemove={() => removeCF(i)}
                onMoveUp={() => moveCF(i, -1)}
                onMoveDown={() => moveCF(i, 1)} />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addConditionalField} className="w-full text-xs h-9 border-dashed border-amber-300 text-amber-700 hover:bg-amber-50">
              <Plus className="h-3 w-3 mr-1" /> Agregar campo adicional para &quot;{type.label || 'este trámite'}&quot;
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Form Preview ─────────────────────────────────────────────────────────────

function PreviewFieldInteractive({ field }: { field: FormField }) {
  const [selectedOption, setSelectedOption] = useState('')
  const base = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600'
  const isWide = field.type === 'file' || field.type === 'textarea'

  const activeSubFields = field.hasConditionalOptions
    ? (field.conditionalOptions?.find((o) => o.value === selectedOption)?.fields ?? [])
    : []

  return (
    <>
      <div className={`space-y-1 ${isWide ? 'col-span-2' : ''}`}>
        <label className="text-xs font-semibold text-slate-600">
          {field.label || <span className="text-slate-400 italic">Campo sin etiqueta</span>}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {field.type === 'textarea' ? (
          <textarea rows={3} placeholder={field.placeholder} className={`${base} resize-none`} readOnly />
        ) : field.type === 'select' && !field.hasConditionalOptions ? (
          <select className={base} defaultValue="">
            <option value="" disabled>{field.placeholder || 'Seleccione...'}</option>
            {(field.options || []).map((o, i) => <option key={i}>{o}</option>)}
          </select>
        ) : field.type === 'select' && field.hasConditionalOptions ? (
          <select className={base} value={selectedOption} onChange={(e) => setSelectedOption(e.target.value)}>
            <option value="" disabled>{field.placeholder || 'Seleccione...'}</option>
            {(field.conditionalOptions || []).map((o, i) => <option key={i} value={o.value}>{o.value}</option>)}
          </select>
        ) : field.type === 'file' ? (
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center text-xs text-slate-400 bg-slate-50">
            <UploadCloud className="h-5 w-5 mx-auto mb-1 text-slate-300" />
            Seleccionar archivo
          </div>
        ) : (
          <input type={field.type} placeholder={field.placeholder} className={base} readOnly />
        )}
      </div>

      {activeSubFields.length > 0 && (
         <div className="col-span-2 rounded-lg border border-teal-200 bg-teal-50/40 p-3 mt-1 space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Información Adicional — {selectedOption}</p>
          <div className="grid grid-cols-2 gap-3">
             {activeSubFields.map(sub => (
                <div key={sub.id} className="space-y-1">
                   <label className="text-xs font-semibold text-slate-600">
                     {sub.label}{sub.required && <span className="text-red-500 ml-1">*</span>}
                   </label>
                   {sub.type === 'textarea' ? (
                     <textarea rows={2} placeholder={sub.placeholder} className={`${base} resize-none text-xs`} readOnly />
                   ) : sub.type === 'file' ? (
                     <div className="border-2 border-dashed border-slate-200 rounded p-2 text-center text-[10px] text-slate-400 bg-white">
                        Archivo
                     </div>
                   ) : (
                     <input type={sub.type} placeholder={sub.placeholder} className={`${base} h-8 text-xs py-1`} readOnly />
                   )}
                </div>
             ))}
          </div>
         </div>
      )}
    </>
  )
}

function FormPreview({ template }: { template: FormTemplate }) {
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const selectedType = template.requestTypes.find(rt => rt.id === selectedTypeId)

  return (
    <div className="bg-slate-100 rounded-2xl p-4 h-full overflow-y-auto">
      <div className="text-center mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">👁️ Vista Previa del Paciente</span>
      </div>
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden max-w-lg mx-auto">
        {/* Mock institution header */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white text-xs font-bold">IPS</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Portal del Paciente</p>
              <p className="text-teal-200 text-xs">Su institución</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Request type selector */}
          {template.requestTypes.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Trámite a Solicitar <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-teal-600">
                  <option value="">Seleccione el tipo de trámite...</option>
                  {template.requestTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
          )}

          {/* Conditional fields for selected type */}
          {selectedType && selectedType.conditionalFields.length > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-3">
              <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">Información para: {selectedType.label}</p>
              {selectedType.conditionalFields.map(cf => (
                  <PreviewFieldInteractive key={cf.id} field={cf} />
              ))}
            </div>
          )}

          {/* Main fields */}
          <div className="grid grid-cols-2 gap-3">
            {template.fields.map(field => (
                <PreviewFieldInteractive key={field.id} field={field} />
            ))}
          </div>

          {/* Submit button */}
          <button className="w-full bg-teal-700 hover:bg-teal-800 text-white py-3 rounded-lg text-sm font-semibold transition-colors mt-2">
            Radicar Solicitud Médica
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main FormBuilder ─────────────────────────────────────────────────────────

interface FormBuilderProps {
  initialTemplate: FormTemplate | null
  initialTemplateName?: string
  templateId: string | null
  institutionId: string
  onSave: (template: FormTemplate, name: string, institutionId: string) => Promise<{ success: boolean; error?: string }>
}

export function FormBuilder({ initialTemplate, initialTemplateName, templateId, institutionId, onSave }: FormBuilderProps) {
  const [template, setTemplate] = useState<FormTemplate>(initialTemplate || DEFAULT_TEMPLATE)
  const [templateName, setTemplateName] = useState(initialTemplateName || 'Formulario de Radicación')
  const [activeTab, setActiveTab] = useState<'fields' | 'types'>('fields')
  const [showPreview, setShowPreview] = useState(true)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // ── Fields helpers ──────────────────────────────────────────────────────────

  const fields = template.fields
  const setFields = (f: FormField[]) => setTemplate(t => ({ ...t, fields: f }))
  const addField = () => setFields([...fields, { id: crypto.randomUUID(), label: '', type: 'text', required: false, placeholder: '' }])
  const updateField = (i: number, u: Partial<FormField>) => { const f = [...fields]; f[i] = { ...f[i], ...u }; setFields(f) }
  const removeField = (i: number) => setFields(fields.filter((_, j) => j !== i))
  const moveField = (i: number, dir: -1 | 1) => {
    const f = [...fields]; const j = i + dir
    if (j < 0 || j >= f.length) return;
    [f[i], f[j]] = [f[j], f[i]]; setFields(f)
  }

  // ── RequestType helpers ─────────────────────────────────────────────────────

  const types = template.requestTypes
  const setTypes = (r: RequestType[]) => setTemplate(t => ({ ...t, requestTypes: r }))
  const addType = () => setTypes([...types, { id: crypto.randomUUID(), label: '', conditionalFields: [] }])
  const updateType = (i: number, u: Partial<RequestType>) => { const r = [...types]; r[i] = { ...r[i], ...u }; setTypes(r) }
  const removeType = (i: number) => setTypes(types.filter((_, j) => j !== i))
  const moveType = (i: number, dir: -1 | 1) => {
    const r = [...types]; const j = i + dir
    if (j < 0 || j >= r.length) return;
    [r[i], r[j]] = [r[j], r[i]]; setTypes(r)
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setLoading(true)
    const result = await onSave(template, templateName, institutionId)
    setLoading(false)
    if (result.success) {
      toast({ title: '✅ Plantilla Publicada', description: 'El formulario del paciente ha sido actualizado con los cambios.', className: 'bg-green-50 border-green-200' })
    } else {
      toast({ title: 'Error al Guardar', description: result.error, variant: 'destructive' })
    }
  }

  const tabClass = (tab: 'fields' | 'types') =>
    `flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`

  return (
    <div className="space-y-4">

      {/* Status Banner */}
      {templateId ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <div>
              <p className="text-sm font-bold text-teal-800">Plantilla activa: <span className="font-black">{initialTemplateName || templateName}</span></p>
              <p className="text-xs text-teal-600 mt-0.5">{fields.length} campo{fields.length !== 1 ? 's' : ''} · {types.length} tipo{types.length !== 1 ? 's' : ''} de trámite</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-800">Sin plantilla guardada</p>
            <p className="text-xs text-amber-700 mt-0.5">Configure el formulario abajo y presione «Publicar Cambios» para activarlo en el portal público.</p>
          </div>
        </div>
      )}

      {/* Header Toolbar */}
      <Card className="border-slate-200">
        <CardContent className="pt-4 flex flex-col md:flex-row gap-3 items-end justify-between">
          <div className="w-full md:w-1/2 space-y-1">
            <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Nombre de la plantilla</Label>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="h-10 font-semibold" placeholder="Ej: Formulario de Radicación IPS..." />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="h-10 gap-2">
              {showPreview ? <><EyeOff className="h-4 w-4" /> Ocultar Preview</> : <><Eye className="h-4 w-4" /> Mostrar Preview</>}
            </Button>
            <Button onClick={handleSave} disabled={loading} className="h-10 bg-teal-700 hover:bg-teal-800 gap-2 font-semibold px-6">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Publicando...</> : <><Save className="h-4 w-4" /> Publicar Cambios</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main — Editor + Preview */}
      <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>

        {/* Editor Panel */}
        <div className={showPreview ? 'lg:col-span-3' : ''}>
          <Card className="border-slate-200">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 rounded-t-xl overflow-hidden">
              <button className={tabClass('fields')} onClick={() => setActiveTab('fields')}>
                <Layers className="h-4 w-4" /> Campos del Formulario
                <span className="ml-1 text-xs bg-slate-200 text-slate-600 rounded-full px-1.5">{fields.length}</span>
              </button>
              <button className={tabClass('types')} onClick={() => setActiveTab('types')}>
                <ClipboardList className="h-4 w-4" /> Tipos de Trámite
                <span className="ml-1 text-xs bg-slate-200 text-slate-600 rounded-full px-1.5">{types.length}</span>
              </button>
            </div>

            <CardContent className="p-4 space-y-3">
              {/* Fields tab */}
              {activeTab === 'fields' && (
                <>
                  <p className="text-xs text-slate-500 pb-1">
                    Estos son <strong>todos</strong> los campos del formulario del paciente, en el orden en que aparecerán. Los campos con <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5 text-[10px]"><Shield className="h-2.5 w-2.5" />Sistema</span> son esenciales para el funcionamiento de la plataforma.
                  </p>
                  {fields.map((field, i) => (
                    <FieldCard key={field.id} field={field} isFirst={i === 0} isLast={i === fields.length - 1}
                      onUpdate={(u) => updateField(i, u)}
                      onRemove={() => removeField(i)}
                      onMoveUp={() => moveField(i, -1)}
                      onMoveDown={() => moveField(i, 1)} />
                  ))}
                  <Button type="button" variant="outline" onClick={addField} className="w-full h-10 border-dashed border-teal-300 text-teal-700 hover:bg-teal-50 text-sm font-semibold">
                    <Plus className="h-4 w-4 mr-2" /> Agregar Campo Personalizado
                  </Button>
                </>
              )}

              {/* Types tab */}
              {activeTab === 'types' && (
                <>
                  <p className="text-xs text-slate-500 pb-1">
                    Configure los tipos de trámite disponibles. Al seleccionar uno, se pueden activar <strong>campos adicionales específicos</strong> para ese trámite.
                  </p>
                  {types.map((type, i) => (
                    <RequestTypeCard key={type.id} type={type} isFirst={i === 0} isLast={i === types.length - 1}
                      onUpdate={(u) => updateType(i, u)}
                      onRemove={() => removeType(i)}
                      onMoveUp={() => moveType(i, -1)}
                      onMoveDown={() => moveType(i, 1)} />
                  ))}
                  <Button type="button" variant="outline" onClick={addType} className="w-full h-10 border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-semibold">
                    <Plus className="h-4 w-4 mr-2" /> Agregar Tipo de Trámite
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:col-span-2">
            <FormPreview template={template} />
          </div>
        )}
      </div>
    </div>
  )
}

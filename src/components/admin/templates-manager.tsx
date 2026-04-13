'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Pencil, Save, X, FileText, Variable } from 'lucide-react'
import type { ResponseTemplate } from './template-actions'

const VARIABLES = [
  { tag: '{{nombre_paciente}}', desc: 'Nombre del paciente' },
  { tag: '{{radicado}}',        desc: 'Número de radicado' },
  { tag: '{{fecha_cita}}',      desc: 'Fecha de la cita' },
  { tag: '{{hora_cita}}',       desc: 'Hora de la cita' },
  { tag: '{{doctor}}',          desc: 'Nombre del doctor' },
  { tag: '{{especialidad}}',    desc: 'Especialidad médica' },
  { tag: '{{institucion}}',     desc: 'Nombre de la institución' },
]

interface Props {
  templates: ResponseTemplate[]
  onCreate:  (fd: FormData) => Promise<any>
  onUpdate:  (fd: FormData) => Promise<any>
  onDelete:  (id: string)   => Promise<any>
}

export function TemplatesManager({ templates: initial, onCreate, onUpdate, onDelete }: Props) {
  const [templates, setTemplates]   = useState<ResponseTemplate[]>(initial)
  const [editing, setEditing]       = useState<ResponseTemplate | null>(null)
  const [creating, setCreating]     = useState(false)
  const [newName, setNewName]       = useState('')
  const [newBody, setNewBody]       = useState('')
  const [editName, setEditName]     = useState('')
  const [editBody, setEditBody]     = useState('')
  const [activeTextarea, setActive] = useState<'new' | 'edit' | null>(null)
  const [isPending, start]          = useTransition()

  const insertVar = (tag: string) => {
    if (activeTextarea === 'new') setNewBody(p => p + tag)
    if (activeTextarea === 'edit') setEditBody(p => p + tag)
  }

  const handleCreate = () => {
    const fd = new FormData()
    fd.set('name', newName)
    fd.set('body', newBody)
    start(async () => {
      const res = await onCreate(fd)
      if (res?.success) {
        setTemplates(prev => [...prev, { id: crypto.randomUUID(), institution_id: null, name: newName, body: newBody, created_at: new Date().toISOString() }])
        setCreating(false); setNewName(''); setNewBody('')
      }
    })
  }

  const handleUpdate = () => {
    if (!editing) return
    const fd = new FormData()
    fd.set('id', editing.id)
    fd.set('name', editName)
    fd.set('body', editBody)
    start(async () => {
      const res = await onUpdate(fd)
      if (res?.success) {
        setTemplates(prev => prev.map(t => t.id === editing.id ? { ...t, name: editName, body: editBody } : t))
        setEditing(null)
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return
    start(async () => {
      const res = await onDelete(id)
      if (res?.success) setTemplates(prev => prev.filter(t => t.id !== id))
    })
  }

  const startEdit = (t: ResponseTemplate) => {
    setEditing(t); setEditName(t.name); setEditBody(t.body); setCreating(false)
  }

  const VarPicker = () => (
    <div className="bg-slate-800 rounded-lg p-3 mt-2">
      <p className="text-xs text-teal-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
        <Variable className="w-3 h-3" /> Variables disponibles — clic para insertar
      </p>
      <div className="flex flex-wrap gap-1.5">
        {VARIABLES.map(v => (
          <button
            key={v.tag}
            type="button"
            onClick={() => insertVar(v.tag)}
            title={v.desc}
            className="text-xs bg-slate-700 hover:bg-teal-700 text-teal-300 hover:text-white border border-slate-600 hover:border-teal-500 rounded px-2 py-1 font-mono transition-colors"
          >
            {v.tag}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" /> Plantillas de Respuesta
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Cree respuestas reutilizables con variables dinámicas para agilizar la gestión.
          </p>
        </div>
        {!creating && (
          <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={() => { setCreating(true); setEditing(null) }}>
            <Plus className="w-4 h-4 mr-1" /> Nueva Plantilla
          </Button>
        )}
      </div>

      {/* Create Form */}
      {creating && (
        <div className="bg-slate-900 rounded-xl p-5 space-y-3 border border-slate-700">
          <p className="text-sm font-bold text-white">Nueva Plantilla</p>
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Nombre de la Plantilla</Label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ej: Confirmación de Cita, Solicitud Aprobada..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Cuerpo del Mensaje</Label>
            <textarea
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              onFocus={() => setActive('new')}
              rows={5}
              placeholder="Hola {{nombre_paciente}}, su cita ha sido confirmada para el {{fecha_cita}} a las {{hora_cita}} con el {{doctor}}..."
              className="w-full bg-slate-800 border border-slate-600 text-white placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
          {activeTextarea === 'new' && <VarPicker />}
          <div className="flex gap-2 pt-1">
            <Button size="sm" disabled={isPending || !newName || !newBody} onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700">
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => { setCreating(false); setNewName(''); setNewBody(''); setActive(null) }}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 && !creating ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Sin plantillas aún</p>
          <p className="text-slate-400 text-sm mt-1">Cree la primera para agilizar sus respuestas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
              {editing?.id === t.id ? (
                /* Edit Mode */
                <div className="bg-slate-900 p-5 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Nombre</Label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Cuerpo</Label>
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      onFocus={() => setActive('edit')}
                      rows={5}
                      className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                  </div>
                  {activeTextarea === 'edit' && <VarPicker />}
                  <div className="flex gap-2">
                    <Button size="sm" disabled={isPending} onClick={handleUpdate} className="bg-teal-600 hover:bg-teal-700">
                      <Save className="w-4 h-4 mr-1" /> Actualizar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => { setEditing(null); setActive(null) }}>
                      <X className="w-4 h-4 mr-1" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2 font-mono">{t.body}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => startEdit(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

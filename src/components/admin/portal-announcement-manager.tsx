'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { updatePortalAnnouncement } from '@/app/admin/settings/actions'
import {
  FileText, CheckCircle2, Plus, X, Eye, Sparkles, Loader2,
  FileCheck, ShieldAlert, Check
} from 'lucide-react'

interface PortalAnnouncementData {
  enabled: boolean
  title: string
  message: string
  documents: string[]
}

interface Props {
  institutionId: string
  initialData?: Partial<PortalAnnouncementData> | null
  primaryColor?: string
  secondaryColor?: string
  institutionSlug?: string | null
}

const COMMON_DOCS = [
  'Autorización',
  'Orden Médica',
  'Historia Clínica',
  'Documento de Identificación',
  'Fórmula Médica',
  'Exámenes de Laboratorio',
  'Factura / Comprobante',
  'Consentimiento Informado',
]

export function PortalAnnouncementManager({
  institutionId,
  initialData,
  primaryColor = '#0f766e',
  secondaryColor = '#134e4a',
  institutionSlug,
}: Props) {
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true)
  const [title, setTitle] = useState(initialData?.title || 'Documentos requeridos antes de radicar')
  const [message, setMessage] = useState(
    initialData?.message ||
    'Ten a la mano los siguientes soportes para agilizar la radicación y respuesta de tu solicitud:'
  )
  const [documents, setDocuments] = useState<string[]>(
    initialData?.documents && initialData.documents.length > 0
      ? initialData.documents
      : ['Autorización', 'Orden Médica', 'Historia Clínica', 'Documento de Identificación']
  )
  const [newDoc, setNewDoc] = useState('')
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleAddDoc = (docName: string) => {
    const trimmed = docName.trim()
    if (!trimmed) return
    if (documents.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      toast({
        title: 'Documento ya agregado',
        description: `"${trimmed}" ya se encuentra en la lista.`,
      })
      return
    }
    setDocuments([...documents, trimmed])
    setNewDoc('')
  }

  const handleRemoveDoc = (indexToRemove: number) => {
    setDocuments(documents.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSave = () => {
    if (documents.length === 0 && enabled) {
      toast({
        title: 'Agrega al menos un documento',
        description: 'Debes incluir al menos un documento o desactivar el anuncio.',
        variant: 'destructive',
      })
      return
    }

    startTransition(async () => {
      const res = await updatePortalAnnouncement(institutionId, {
        enabled,
        title: title.trim() || 'Documentos requeridos antes de radicar',
        message: message.trim(),
        documents,
      })

      if (res.success) {
        toast({
          title: 'Anuncio Guardado',
          description: 'El anuncio en la cabecera del portal ha sido actualizado correctamente.',
        })
      } else {
        toast({
          title: 'Error al guardar',
          description: res.error,
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-800 text-lg">
              Aviso de Documentos Requeridos (Cabecera del Portal)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Indica a los pacientes qué documentos deben tener listos antes de iniciar su solicitud para evitar radicaciones incompletas.
          </p>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          <span className="ml-3 text-xs font-bold text-slate-700">
            {enabled ? 'Anuncio Visible' : 'Anuncio Oculto'}
          </span>
        </label>
      </div>

      {enabled && (
        <div className="space-y-6 pt-2">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="announcementTitle" className="text-xs font-bold text-slate-700">
                Título del Anuncio
              </Label>
              <Input
                id="announcementTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Documentos requeridos antes de radicar"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="announcementMsg" className="text-xs font-bold text-slate-700">
                Mensaje o Instrucción
              </Label>
              <Input
                id="announcementMsg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ej. Ten a la mano los siguientes soportes para agilizar tu trámite:"
                className="text-sm"
              />
            </div>
          </div>

          {/* Document list manager */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Documentos a Solicitar ({documents.length})</span>
              <span className="text-[11px] font-normal text-slate-400">
                Haz clic en la '×' para eliminar
              </span>
            </Label>

            {/* Current Chips */}
            <div className="flex flex-wrap gap-2 min-h-[42px] p-3 rounded-xl bg-slate-50 border border-slate-200">
              {documents.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No hay documentos en la lista</span>
              ) : (
                documents.map((doc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-slate-200 shadow-2xs group"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{doc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(idx)}
                      className="ml-1 text-slate-400 hover:text-red-500 rounded p-0.5 transition-colors"
                      title="Eliminar documento"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Input to add custom document */}
            <div className="flex gap-2">
              <Input
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddDoc(newDoc)
                  }
                }}
                placeholder="Escribe otro documento (ej. Examen de Laboratorio, Consentimiento...)"
                className="text-sm"
              />
              <Button
                type="button"
                onClick={() => handleAddDoc(newDoc)}
                disabled={!newDoc.trim()}
                variant="outline"
                className="shrink-0 font-medium"
              >
                <Plus className="w-4 h-4 mr-1 text-teal-600" />
                Agregar
              </Button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Sugerencias rápidas (clic para añadir):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_DOCS.map((doc) => {
                  const isAdded = documents.some((d) => d.toLowerCase() === doc.toLowerCase())
                  return (
                    <button
                      key={doc}
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleAddDoc(doc)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        isAdded
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/50'
                      }`}
                    >
                      {isAdded ? '✓ ' : '+ '}
                      {doc}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Live Preview Box ────────────────────────────────────────── */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-teal-600" />
                Previsualización en la Cabecera del Portal
              </Label>
              {institutionSlug && (
                <a
                  href={`/portal/${institutionSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium hover:underline flex items-center gap-1"
                >
                  Ver portal en vivo ↗
                </a>
              )}
            </div>

            {/* Preview Banner simulating portal header */}
            <div
              className="p-6 rounded-2xl overflow-hidden shadow-inner text-white"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              }}
            >
              <div className="max-w-2xl mx-auto bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 sm:p-5 shadow-lg text-left">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 text-white shrink-0">
                    <FileCheck className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                    {title || 'Documentos requeridos antes de radicar'}
                  </h4>
                </div>
                {message && (
                  <p className="text-xs text-white/85 leading-relaxed mb-3">
                    {message}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {documents.length === 0 ? (
                    <span className="text-xs text-white/60 italic">Sin documentos seleccionados</span>
                  ) : (
                    documents.map((doc, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/95 text-slate-800 shadow-sm"
                      >
                        <Check className="w-3 h-3 text-teal-600 stroke-[3]" />
                        {doc}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="pt-2 flex justify-end border-t border-slate-100">
        <Button
          onClick={handleSave}
          disabled={pending}
          className="bg-teal-600 hover:bg-teal-700 font-semibold"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando cambios...
            </>
          ) : (
            'Guardar Configuración del Anuncio'
          )}
        </Button>
      </div>
    </div>
  )
}

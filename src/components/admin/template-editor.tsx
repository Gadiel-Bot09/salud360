'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, FileType, FileText, ArrowLeft, UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function TemplateEditor({
  initialData,
  templateId,
  formsList,
  onSave
}: {
  initialData: any
  templateId: string
  formsList: { id: string, name: string }[]
  onSave: (id: string, data: any) => Promise<{ success: boolean; error?: string }>
}) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(initialData?.name || '')
  const [type, setType] = useState<'html' | 'docx'>(initialData?.template_type || 'html')
  const [htmlContent, setHtmlContent] = useState(initialData?.html_content || '')
  const [formId, setFormId] = useState(initialData?.form_id || '')
  
  const initialTrigger = initialData?.trigger_condition || {}
  const [triggerType, setTriggerType] = useState<'none' | 'requestType' | 'field'>(initialTrigger.type || 'none')
  const [triggerValue, setTriggerValue] = useState(initialTrigger.value || '')
  const [triggerField, setTriggerField] = useState(initialTrigger.fieldName || '')

  const [file, setFile] = useState<File | null>(null)
  
  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' })
      return
    }

    setLoading(true)
    let docxPath = initialData?.docx_url
    
    // Si hay un archivo nuevo, lo subimos
    if (type === 'docx' && file) {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('legal-templates')
        .upload(fileName, file)
        
      if (uploadError) {
        toast({ title: 'Error al subir archivo', description: uploadError.message, variant: 'destructive' })
        setLoading(false)
        return
      }
      docxPath = uploadData.path
    }

    const { success, error } = await onSave(templateId, {
      name,
      template_type: type,
      html_content: type === 'html' ? htmlContent : undefined,
      form_id: formId || null,
      trigger_condition: triggerType === 'none' ? null : 
                         triggerType === 'requestType' ? { type: 'requestType', value: triggerValue } :
                         { type: 'field', fieldName: triggerField, value: triggerValue },
      docx_file_path: docxPath
    })

    if (success) {
      toast({ title: 'Guardado exitosamente' })
      router.push('/admin/templates')
    } else {
      toast({ title: 'Error', description: error, variant: 'destructive' })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/admin/templates')} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-800">
          {templateId === 'new' ? 'Nueva Plantilla' : 'Editar Plantilla'}
        </h1>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nombre de la Plantilla <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Consentimiento Informado..." />
            </div>
            
            <div className="space-y-2">
              <Label>Asociar a un Formulario (Opcional)</Label>
              <select 
                value={formId} 
                onChange={(e) => setFormId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">No asociar (General)</option>
                {formsList.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Si se asocia, podrás inyectar las variables de ese formulario.</p>
            </div>
            
            <div className="space-y-4 md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <Label className="text-base font-semibold">Condición de Activación (Opcional)</Label>
                <p className="text-xs text-slate-500 mb-4">Controla cuándo se debe generar automáticamente esta plantilla.</p>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={triggerType === 'none'} onChange={() => setTriggerType('none')} />
                    Siempre (Cualquier Trámite)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={triggerType === 'requestType'} onChange={() => setTriggerType('requestType')} />
                    Por Tipo de Trámite
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={triggerType === 'field'} onChange={() => setTriggerType('field')} />
                    Por Valor de un Campo
                  </label>
                </div>
              </div>

              {triggerType === 'requestType' && (
                <div className="space-y-2 animate-in fade-in">
                  <Label>Nombre del Trámite exacto</Label>
                  <Input 
                    value={triggerValue} 
                    onChange={(e) => setTriggerValue(e.target.value)} 
                    placeholder="Ej: Solicitar Copia Historia Clínica" 
                  />
                  <p className="text-xs text-slate-500">Ej: La plantilla se genera solo si escogen este trámite específico.</p>
                </div>
              )}

              {triggerType === 'field' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                  <div className="space-y-2">
                    <Label>Nombre de la Variable (Campo)</Label>
                    <Input 
                      value={triggerField} 
                      onChange={(e) => setTriggerField(e.target.value)} 
                      placeholder="Ej: Tipo de Solicitante" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Debe ser igual a (Valor)</Label>
                    <Input 
                      value={triggerValue} 
                      onChange={(e) => setTriggerValue(e.target.value)} 
                      placeholder="Ej: Propietario" 
                    />
                  </div>
                  <p className="text-xs text-slate-500 col-span-2">Ej: La plantilla se genera solo si el paciente seleccionó "Propietario" en la lista de "Tipo de Solicitante".</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-semibold">Tipo de Plantilla</Label>
            <div className="flex gap-4">
              <button
                onClick={() => setType('html')}
                className={`flex-1 flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 transition-all ${type === 'html' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300'}`}
              >
                <FileType className={`h-8 w-8 ${type === 'html' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`font-medium ${type === 'html' ? 'text-indigo-700' : 'text-slate-600'}`}>Editor Web (HTML)</span>
                <span className="text-xs text-slate-500 text-center">Escribe o pega el texto y añade las variables directamente aquí. Ideal para documentos sencillos.</span>
              </button>

              <button
                onClick={() => setType('docx')}
                className={`flex-1 flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 transition-all ${type === 'docx' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300'}`}
              >
                <FileText className={`h-8 w-8 ${type === 'docx' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`font-medium ${type === 'docx' ? 'text-blue-700' : 'text-slate-600'}`}>Subir Documento (Word)</span>
                <span className="text-xs text-slate-500 text-center">Sube tu archivo .docx con las variables ya escritas. Ideal para formatos institucionales complejos.</span>
              </button>
            </div>
          </div>

          {type === 'html' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-end">
                <Label>Contenido del Documento</Label>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">Variables: usa {'{{ nombre_campo }}'}</span>
              </div>
              <textarea 
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="w-full min-h-[400px] p-4 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                placeholder="<h1>Historia Clínica</h1>&#10;<p>El paciente {{ nombre }} con cédula {{ cedula }} autoriza...</p>"
              />
            </div>
          )}

          {type === 'docx' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center">
              <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">Sube tu archivo .docx</p>
                <p className="text-xs text-slate-500">Recuerda escribir las variables en tu Word así: {'{{ nombre_campo }}'}</p>
              </div>
              <input 
                type="file" 
                accept=".docx" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full max-w-sm mx-auto text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {initialData?.docx_url && !file && (
                <p className="text-xs text-green-600 font-medium">✅ Ya hay un archivo guardado. Sube otro si deseas reemplazarlo.</p>
              )}
            </div>
          )}

          <div className="pt-6 border-t flex justify-end">
            <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Plantilla
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

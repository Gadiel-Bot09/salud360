'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, ArrowUp, ArrowDown, Save, Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

export type FormFieldType = 'text' | 'email' | 'number' | 'date' | 'select' | 'file';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[]; // Para selects, separadas por comas
  placeholder?: string;
}

interface FormBuilderProps {
  initialFields: FormField[];
  templateId: string | null;
  institutionId: string;
  onSave: (fields: FormField[], name: string) => Promise<{success: boolean, error?: string}>;
}

export function FormBuilder({ initialFields, templateId, institutionId, onSave }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(initialFields)
  const [templateName, setTemplateName] = useState('Formulario Base Pacientes')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const addField = () => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      label: 'Nuevo Campo',
      type: 'text',
      required: false,
      placeholder: ''
    }
    setFields([...fields, newField])
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index)
    setFields(newFields)
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;
    const newFields = [...fields];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
    setFields(newFields);
  }

  const handleSave = async () => {
    setLoading(true)
    const result = await onSave(fields, templateName)
    setLoading(false)
    
    if (result.success) {
      toast({
        title: "Plantilla Guardada",
        description: "El formulario interactivo ha sido actualizado exitosamente.",
        className: "bg-green-50"
      })
    } else {
      toast({
        title: "Error al Guardar",
        description: result.error || "Algo salió mal comunicándose con Supabase.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Configuración Header */}
      <Card className="border-slate-200">
        <CardContent className="pt-6 flex flex-col md:flex-row gap-4 items-end justify-between">
           <div className="w-full md:w-1/2 space-y-2">
             <Label htmlFor="formName">Nombre de la Plantilla Púbica</Label>
             <Input 
                 id="formName" 
                 value={templateName} 
                 onChange={(e) => setTemplateName(e.target.value)} 
             />
           </div>
           <Button onClick={handleSave} disabled={loading} className="bg-teal-700 hover:bg-teal-800">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Publicar Cambios
           </Button>
        </CardContent>
      </Card>

      {/* Builder Zone */}
      <div className="space-y-4">
         {fields.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
               <p className="text-slate-500 mb-4">No hay campos en esta plantilla. El formulario público estará vacío.</p>
               <Button onClick={addField} variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
                 <Plus className="w-4 h-4 mr-2" />
                 Añadir Primer Campo
               </Button>
            </div>
         ) : (
            fields.map((field, index) => (
              <Card key={field.id} className="border-slate-200 shadow-sm transition-all hover:border-teal-300">
                <CardContent className="p-4 sm:p-6 flex gap-4 md:items-start flex-col md:flex-row">
                   
                   {/* Ordering Controls */}
                   <div className="flex flex-row md:flex-col items-center justify-center gap-1 text-slate-400 bg-slate-50 p-1 rounded">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(index, 'up')} disabled={index === 0}>
                         <ArrowUp className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-bold w-4 text-center">{index + 1}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(index, 'down')} disabled={index === fields.length - 1}>
                         <ArrowDown className="w-4 h-4" />
                      </Button>
                   </div>

                   {/* Field Editors */}
                   <div className="flex-1 space-y-4 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         
                         <div className="space-y-2">
                            <Label className="text-xs text-slate-500 uppercase">Etiqueta Principal</Label>
                            <Input 
                               value={field.label} 
                               onChange={(e) => updateField(index, { label: e.target.value })} 
                               className="font-medium outline-teal-500"
                            />
                         </div>

                         <div className="space-y-2">
                            <Label className="text-xs text-slate-500 uppercase">Tipo de Input</Label>
                            <select 
                               className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-950"
                               value={field.type}
                               onChange={(e) => updateField(index, { type: e.target.value as FormFieldType })}
                            >
                               <option value="text">Texto Corto (String)</option>
                               <option value="email">Correo Electrónico</option>
                               <option value="number">Número (Documentos/Tel)</option>
                               <option value="select">Lista Desplegable (Select)</option>
                               <option value="date">Selector de Fecha</option>
                               <option value="file">Subir Archivo Único</option>
                            </select>
                         </div>

                         <div className="space-y-2">
                            <Label className="text-xs text-slate-500 uppercase">Texto de Relleno (Ejemplo)</Label>
                            <Input 
                               value={field.placeholder || ''} 
                               onChange={(e) => updateField(index, { placeholder: e.target.value })} 
                               placeholder="Ej: Ingrese su número de cédula..."
                               disabled={['select', 'file'].includes(field.type)}
                            />
                         </div>

                      </div>

                      {/* Select Options Dynamic Render */}
                      {field.type === 'select' && (
                         <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                             <Label className="text-xs text-slate-500 uppercase mb-2 block">Opciones del Desplegable (Separadas por Comas)</Label>
                             <Input 
                                 placeholder="Medicina General, Pediatría, Odontología" 
                                 value={field.options?.join(', ') || ''}
                                 onChange={(e) => {
                                    const opts = e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                    updateField(index, { options: opts })
                                 }}
                             />
                         </div>
                      )}

                      {/* Switches/Toggles */}
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox 
                            id={`req-${field.id}`} 
                            checked={field.required}
                            onCheckedChange={(checked: boolean | "indeterminate") => updateField(index, { required: !!checked })}
                        />
                        <Label htmlFor={`req-${field.id}`} className="text-sm font-medium leading-none cursor-pointer">
                          Campo Obligatorio (El usuario no puede avanzar sin llenarlo)
                        </Label>
                      </div>
                   </div>

                   {/* Delete Action */}
                   <div className="flex justify-end pt-2 md:pt-0">
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeField(index)}>
                         <Trash2 className="w-5 h-5" />
                      </Button>
                   </div>

                </CardContent>
              </Card>
            ))
         )}
      </div>

      {fields.length > 0 && (
          <div className="flex justify-center border-t border-dashed border-slate-300 pt-6">
             <Button onClick={addField} variant="outline" className="border-teal-200 bg-white text-teal-700 hover:bg-teal-50 shadow-sm rounded-full px-8">
               <Plus className="w-4 h-4 mr-2" />
               Añadir Otro Nuevo Campo
             </Button>
          </div>
      )}

    </div>
  )
}

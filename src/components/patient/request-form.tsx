'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getInstitutionTemplate } from '@/app/actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from "@/hooks/use-toast"
import { Loader2, UploadCloud, ShieldCheck } from 'lucide-react'

// Same as builder interfaces
export type FormFieldType = 'text' | 'email' | 'number' | 'date' | 'select' | 'file';
export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export function RequestForm({ institutions }: { institutions: any[] }) {
    const [institutionId, setInstitutionId] = useState('')
    const [templateFields, setTemplateFields] = useState<FormField[] | null>(null)
    const [loadingTemplate, setLoadingTemplate] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [successRadicado, setSuccessRadicado] = useState<string | null>(null)
    const { toast } = useToast()

    // Dynamically retrieve form when institution changes
    useEffect(() => {
        let mounted = true
        async function fetchTemplate() {
            if (!institutionId) {
                 setTemplateFields(null)
                 return
            }
            setLoadingTemplate(true)
            const fields = await getInstitutionTemplate(institutionId)
            if (mounted) {
                 setTemplateFields(fields?.length > 0 ? fields : [])
                 setLoadingTemplate(false)
            }
        }
        fetchTemplate()
        return () => { mounted = false }
    }, [institutionId])

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSubmitting(true)

        const formData = new FormData(e.currentTarget)
        formData.append('institutionId', institutionId) 
        
        try {
            const res = await fetch('/api/requests/submit', {
                method: 'POST',
                body: formData
            })
            const result = await res.json()

            if (result.success) {
                setSuccessRadicado(result.radicado)
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' })
            }
        } catch (error) {
            toast({ title: 'Fallo de Red', description: 'Imposible conectar con el servidor.', variant: 'destructive' })
        } finally {
            setSubmitting(false)
        }
    }

    if (successRadicado) {
        return (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-4">
               <ShieldCheck className="w-20 h-20 text-teal-600 mb-4" />
               <h2 className="text-3xl font-bold text-slate-800">¡Solicitud Radicada Exitosamente!</h2>
               <p className="text-slate-600 max-w-sm">Su EPS ha recibido su ticket. Hemos enviado un correo de confirmación.</p>
               <div className="bg-teal-50 border border-teal-200 py-4 px-8 rounded-xl font-mono tracking-widest text-2xl font-bold text-teal-800 my-4 shadow-sm">
                   {successRadicado}
               </div>
               <p className="text-xs text-slate-400">Guarde este número para seguimiento futuro.</p>
               <Button variant="outline" onClick={() => window.location.reload()} className="mt-8 border-teal-200">
                  Radicar Nueva Solicitud
               </Button>
            </div>
        )
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Root Step: Select Institution */}
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-800 border-b pb-2">1. Entidad Receptora</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="institution-select" className="font-semibold text-slate-700">Seleccione su Institución (EPS/Clínica)</Label>
                    <select 
                        id="institution-select"
                        value={institutionId}
                        onChange={(e) => setInstitutionId(e.target.value)}
                        className="flex h-11 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                        required
                    >
                        <option value="" disabled>Seleccione en la red...</option>
                        {institutions.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                    </select>
                </div>
                
                {institutionId && (
                   <div className="space-y-2">
                       <Label className="font-semibold text-slate-700">Trámite a Solicitar</Label>
                       <select name="requestType" required className="flex h-11 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-700">
                           <option value="Cita Médica">Agendamiento de Cita Médica</option>
                           <option value="Autorización">Autorización de Procedimientos</option>
                           <option value="Fórmula">Renovación de Fórmula</option>
                           <option value="PQR">PQR (Quejas/Reclamos)</option>
                       </select>
                   </div>
                )}
            </div>
        </div>

        {loadingTemplate && (
            <div className="flex justify-center py-10 opacity-60">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
        )}

        {/* Dynamic & Core Rendering inside a container when template is ready */}
        {templateFields !== null && !loadingTemplate && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
               <h3 className="text-xl font-semibold text-slate-800 border-b pb-2 mb-6">2. Formulario Clínico</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border">
                  
                  {/* Fixed Core Fields for Identity verification required by the DB */}
                  <div className="space-y-2">
                     <Label>Tipo de Identificación *</Label>
                     <select name="documentType" required className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="CC">Cédula de Ciudadanía (CC)</option>
                        <option value="CE">Cédula de Extranjería (CE)</option>
                        <option value="TI">Tarjeta de Identidad (TI)</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <Label>N° de Documento Identidad *</Label>
                     <Input name="documentNumber" type="number" required placeholder="Sin puntos ni guiones" />
                  </div>
                  <div className="space-y-2">
                     <Label>Nombre Completo del Paciente *</Label>
                     <Input name="fullName" type="text" required placeholder="Apellidos y Nombres completos" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label>Correo Electrónico (Para Notificaciones) *</Label>
                            <Input name="email" type="email" required placeholder="correo@notificaciones.com" />
                         </div>
                         <div className="space-y-2">
                            <Label>Teléfono Celular / Whatsapp *</Label>
                            <Input name="phone" type="tel" required placeholder="300-XXX-XXXX" />
                         </div>
                      </div>
                  </div>

                  {/* Horizontal Line Break */}
                  <div className="md:col-span-2 border-t border-dashed border-slate-300 my-2" />

                  {/* Form Builder Dynamic Fields Injection */}
                  {templateFields.length === 0 && (
                     <div className="md:col-span-2 py-4 text-center text-slate-500 italic">
                         Esta EPS recibe radicados generales, puede anexar documentos en la zona final.
                     </div>
                  )}

                  {templateFields.map((field) => (
                      <div key={field.id} className="space-y-2 md:col-span-2">
                         <Label className="flex font-semibold items-center text-slate-700">
                            {field.label} {field.required && <span className="text-red-500 ml-1.5">*</span>}
                         </Label>

                         {/* DYNAMIC FIELD RENDERER */}
                         {field.type === 'select' ? (
                            <select name={field.label} required={field.required} className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-teal-700 focus:outline-none focus:ring-2">
                                <option value="" disabled>Seleccione...</option>
                                {field.options?.map(opt => <option key={opt}>{opt}</option>)}
                            </select>
                         ) : field.type === 'file' ? (
                            <div className="border-2 border-dashed rounded-lg p-6 bg-white hover:bg-slate-100 transition-colors group cursor-pointer relative">
                               <input type="file" name={field.label} required={field.required} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.jpeg,.png" />
                               <div className="flex flex-col items-center justify-center text-slate-500 group-hover:text-teal-600">
                                   <UploadCloud className="w-6 h-6 mb-2" />
                                   <span className="text-sm font-medium">Click o Arrastre su Archivo</span>
                                   <span className="text-xs text-slate-400 mt-1">PDF o Imágenes válidos</span>
                               </div>
                            </div>
                         ) : (
                            <Input 
                               name={field.label} 
                               type={field.type} 
                               required={field.required} 
                               placeholder={field.placeholder || ''} 
                            />
                         )}
                      </div>
                  ))}

               </div>
               
               {/* Final Aceptance */}
               <div className="mt-8">
                  <div className="flex items-center space-x-2 bg-slate-100 p-4 rounded-lg mb-6 text-sm text-slate-700">
                      <Checkbox id="terms" required />
                      <Label htmlFor="terms" className="leading-snug">
                         He verificado que la información es cierta. Autorizo el tratamiento de mis datos personales como paciente según la Ley de Salud y Protección de Datos.
                      </Label>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full h-12 text-lg shadow-lg bg-teal-700 hover:bg-teal-800 font-bold tracking-wide">
                      {submitting ? (
                          <><Loader2 className="w-5 h-5 mr-3 animate-spin"/> Generando Radicado Seguro...</>
                      ) : 'Confirmar y Enviar Solicitud Médica'}
                  </Button>
               </div>
            </div>
        )}
      </form>
    )
}

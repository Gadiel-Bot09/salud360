'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from "@/hooks/use-toast"
import { Loader2, UploadCloud, ShieldCheck } from 'lucide-react'

export type FormFieldType = 'text' | 'email' | 'number' | 'date' | 'select' | 'file';
export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export function RequestForm({ 
   institutionId, 
   institutionName, 
   fields 
}: { 
   institutionId: string, 
   institutionName: string, 
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
               <p className="text-slate-600 max-w-sm">
                   Hemos radicado su solicitud en nombre de <b>{institutionName}</b>. Un correo de confirmación ha sido enviado.
               </p>
               <div className="bg-teal-50 border border-teal-200 py-4 px-8 rounded-xl font-mono tracking-widest text-2xl font-bold text-teal-800 my-4 shadow-sm">
                   {successRadicado}
               </div>
               <p className="text-xs text-slate-400">Guarde este número para consultas futuras.</p>
               <Button variant="outline" onClick={() => window.location.reload()} className="mt-8 border-teal-200">
                  Radicar Nueva Solicitud
               </Button>
            </div>
        )
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-800 border-b pb-2">1. Entidad Receptora</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="font-semibold text-slate-700">Institución</Label>
                    <div className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        {institutionName}
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label className="font-semibold text-slate-700">Trámite a Solicitar *</Label>
                    <select name="requestType" required className="flex h-11 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-700">
                        <option value="Cita Médica">Agendamiento de Cita Médica</option>
                        <option value="Autorización">Autorización de Procedimientos</option>
                        <option value="Fórmula">Renovación de Fórmula</option>
                        <option value="PQR">PQR (Quejas/Reclamos)</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-800 border-b pb-2 mb-6">2. Formulario Clínico</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border">
               {/* Core Fixed Fields */}
               <div className="space-y-2">
                  <Label>Tipo de Identificación *</Label>
                  <select name="documentType" required className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                     <option value="CC">Cédula de Ciudadanía (CC)</option>
                     <option value="CE">Cédula de Extranjería (CE)</option>
                     <option value="TI">Tarjeta de Identidad (TI)</option>
                  </select>
               </div>
               <div className="space-y-2">
                   <Label>Número de Identificación *</Label>
                   <Input name="documentId" type="text" placeholder="Ej: 1102..." required />
               </div>
               <div className="space-y-2 md:col-span-2">
                   <Label>Nombre Completo *</Label>
                   <Input name="fullName" type="text" placeholder="Ej: Juan Perez" required />
               </div>
               <div className="space-y-2">
                   <Label>Correo de Notificaciones *</Label>
                   <Input name="email" type="email" placeholder="Para recibir actualizaciones..." required />
               </div>

               {/* Dynamic Builder Fields rendering */}
               {fields && fields.map(field => {
                   return (
                       <div key={field.id} className={`space-y-2 ${field.type === 'file' || field.type === 'text' ? 'md:col-span-2' : ''}`}>
                           <Label className="flex items-center gap-1 font-medium text-slate-700">
                               {field.label} {field.required && <span className="text-red-500">*</span>}
                           </Label>
                           {field.type === 'text' && <Input name={field.id} required={field.required} placeholder={field.placeholder} />}
                           {field.type === 'email' && <Input type="email" name={field.id} required={field.required} placeholder={field.placeholder} />}
                           {field.type === 'number' && <Input type="number" name={field.id} required={field.required} placeholder={field.placeholder} />}
                           {field.type === 'date' && <Input type="date" name={field.id} required={field.required} />}
                           
                           {field.type === 'select' && field.options && (
                               <select name={field.id} required={field.required} className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                                   <option value="" disabled selected>Seleccione opción...</option>
                                   {field.options.map(o => (
                                       <option key={o} value={o}>{o}</option>
                                   ))}
                               </select>
                           )}

                           {field.type === 'file' && (
                               <div className="border-2 border-dashed border-slate-200 bg-white rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                                  <UploadCloud className="w-8 h-8 text-teal-500 mb-2" />
                                  <span className="text-sm text-slate-500 font-medium">Arrastre un documento o haga clic</span>
                                  <input type="file" name={field.id} required={field.required} className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                               </div>
                           )}
                       </div>
                   )
               })}
            </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
            <Button disabled={submitting} type="submit" className="w-full text-lg h-14 bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20">
               {submitting ? (
                   <><Loader2 className="mr-2 h-5 w-5 animate-spin"/> Generando Radicado Seguro...</>
               ) : (
                   'Radicar Solicitud Médica'
               )}
            </Button>
        </div>
      </form>
    )
}

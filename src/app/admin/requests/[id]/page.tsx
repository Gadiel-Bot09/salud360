/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileDown, ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { sendStatusUpdateEmail } from '@/lib/resend'

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createClient()

    // Fetch request data
    const { data: request, error } = await supabase
        .from('requests')
        .select(`
      *,
      request_history (*),
      request_attachments (*)
    `)
        .eq('id', params.id)
        .single()

    if (error || !request) {
        return <div className="p-8 text-center text-red-500">Error: Solicitud no encontrada</div>
    }

    // Server Action for updating status
    async function updateStatus(formData: FormData) {
        'use server'
        const newStatus = formData.get('status') as string
        const comment = formData.get('comment') as string

        const sb = await createClient()
        const { data: { user } } = await sb.auth.getUser()

        // Update request
        await sb.from('requests').update({ status: newStatus }).eq('id', request.id)

        // Add history
        await sb.from('request_history').insert({
            request_id: request.id,
            action: `Cambiado a ${newStatus}`,
            from_status: request.status,
            to_status: newStatus,
            user_id: user?.id,
            comment: comment
        })

        // NOTE: In a real app, Resend trigger logic will be integrated here to email the user
        if (newStatus === 'responded' || newStatus === 'closed' || newStatus === 'escalated') {
            await sendStatusUpdateEmail(request.patient_email, request.radicado, newStatus, comment)
        }

        revalidatePath(`/admin/requests/${request.id}`)
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center space-x-4 mb-8">
                <Link href="/admin/requests">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        Detalle de Solicitud
                        <Badge variant="outline" className="text-lg bg-teal-50 text-teal-800">{request.radicado}</Badge>
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Radicada el {format(new Date(request.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column - Patient Data & Request */}
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-700">Información del Paciente</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-slate-500">Nombre Completo</p>
                                <p className="font-semibold">{request.patient_data_json.fullName}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Documento</p>
                                <p className="font-semibold">{request.patient_document_type} {request.patient_document_number}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Correo Electrónico</p>
                                <p className="font-semibold">{request.patient_email}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Teléfono</p>
                                <p className="font-semibold">{request.patient_data_json.phone}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-700 flex justify-between">
                                <span>Detalle del Requerimiento</span>
                                <Badge variant="secondary">{request.type}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {request.type === 'Citas médicas' && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded text-sm">
                                    <div>
                                        <span className="text-slate-500 block">Especialidad</span>
                                        <span className="font-semibold">{request.patient_data_json.specialty}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">Fecha Preferida</span>
                                        <span className="font-semibold">{request.patient_data_json.preferredDate || 'N/A'}</span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-slate-500 text-sm mb-1">Descripción</p>
                                <div className="bg-white border rounded-md p-4 text-slate-800 whitespace-pre-wrap">
                                    {request.patient_data_json.description}
                                </div>
                            </div>

                            {request.request_attachments && request.request_attachments.length > 0 && (
                                <div className="pt-4 mt-4 border-t">
                                    <p className="text-slate-500 text-sm mb-3">Documentos Adjuntos</p>
                                    <div className="space-y-2">
                                        {request.request_attachments.map((file: any) => (
                                            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                                                <div className="flex items-center space-x-3 truncate">
                                                    <FileDown className="h-5 w-5 text-teal-600 flex-shrink-0" />
                                                    <span className="text-sm font-medium truncate">{file.file_name}</span>
                                                </div>
                                                <Button variant="ghost" size="sm" asChild>
                                                    {/* Using presigned URLs or public URLs based on bucket settings */}
                                                    <a href={`/api/files/${file.id}`} target="_blank">Descargar</a>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Actions & History */}
                <div className="space-y-8">
                    <Card className="border-teal-200 shadow-sm">
                        <CardHeader className="bg-teal-50 border-b border-teal-100 pb-4 rounded-t-xl">
                            <CardTitle className="text-teal-800 text-lg">Gestión de Estado</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form action={updateStatus} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="status">Actualizar Estado</Label>
                                    <Select name="status" defaultValue={request.status}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="received">Recibida</SelectItem>
                                            <SelectItem value="processing">En Trámite</SelectItem>
                                            <SelectItem value="responded">Respondida (Notificar paciente)</SelectItem>
                                            <SelectItem value="closed">Cerrada</SelectItem>
                                            <SelectItem value="escalated">Escalada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="comment">Comentarios Internos / Respuesta</Label>
                                    <Textarea
                                        name="comment"
                                        placeholder="Escriba la respuesta al paciente o notas internas..."
                                        className="min-h-[100px]"
                                    />
                                </div>

                                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                                    <Send className="w-4 h-4 mr-2" />
                                    Guardar y Notificar
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-700">Historial (Trazabilidad)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                {request.request_history?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((hist: any, i: number) => (
                                    <div key={hist.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                            <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border shadow-sm">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-bold text-slate-900 text-sm">{hist.action}</div>
                                                <time className="text-xs font-medium text-slate-500">
                                                    {format(new Date(hist.created_at), "dd/MM HH:mm")}
                                                </time>
                                            </div>
                                            {hist.comment && <div className="text-slate-500 text-xs mt-2">{hist.comment}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

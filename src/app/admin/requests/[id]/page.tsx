/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowLeft, Send, User, Mail, Phone, FileText,
  Paperclip, Clock, CheckCircle2, AlertTriangle, Tag, Download
} from 'lucide-react'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { sendStatusUpdateEmail, sendAppointmentConfirmationEmail } from '@/lib/resend'
import { getResponseTemplates } from '@/app/admin/settings/template-actions'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { StatusManagementForm } from '@/components/admin/status-management-form'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CORE_KEYS = new Set(['fullName', 'phone', 'documentType', 'documentNumber', 'email', 'requestType', 'institutionId'])

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  received:   { label: 'Recibida',   color: 'bg-blue-100 text-blue-800 border-blue-200',    icon: Clock },
  processing: { label: 'En Trámite', color: 'bg-amber-100 text-amber-800 border-amber-200',  icon: AlertTriangle },
  responded:  { label: 'Respondida', color: 'bg-teal-100 text-teal-800 border-teal-200',     icon: Send },
  closed:     { label: 'Cerrada',    color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  escalated:  { label: 'Escalada',   color: 'bg-red-100 text-red-800 border-red-200',        icon: AlertTriangle },
}

function FieldValue({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-slate-800 break-words">{value || '—'}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch request with related data using the Admin client to bypass RLS restrictions on attachments
  const { data: request, error } = await supabaseAdmin
    .from('requests')
    .select('*, request_history(*), request_attachments(*)')
    .eq('id', params.id)
    .single()

  if (error || !request) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-lg font-semibold text-slate-700">Solicitud no encontrada</p>
        <Link href="/admin/requests" className="text-teal-600 text-sm hover:underline mt-2 block">← Volver a solicitudes</Link>
      </div>
    )
  }

  // Setup S3 Client for Minio
  const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: process.env.MINIO_ENDPOINT,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!
    },
    forcePathStyle: true
  })
  const bucketName = process.env.MINIO_BUCKET_NAME!

  // Generate signed URLs from MinIO
  const attachmentsWithUrls = await Promise.all(
    (request.request_attachments || []).map(async (att: any) => {
      try {
        const url = await getSignedUrl(s3, new GetObjectCommand({
            Bucket: bucketName,
            Key: att.file_path
        }), { expiresIn: 3600 })
        return { ...att, signedUrl: url }
      } catch (e) {
        console.error('Error signing URL from Minio:', e);
        return { ...att, signedUrl: null }
      }
    })
  )

  // Extract dynamic fields (non-core from patient_data_json)
  const json = request.patient_data_json || {}
  const dynamicFields = Object.entries(json).filter(([key]) => !CORE_KEYS.has(key))

  const fullName = json.fullName || '—'
  const phone    = json.phone    || '—'

  // Status info
  const statusInfo = STATUS_MAP[request.status] || { label: request.status, color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Tag }
  const StatusIcon = statusInfo.icon

  const patientAttachments = attachmentsWithUrls.filter(a => !a.file_path.includes('/admin/'))
  const adminAttachments   = attachmentsWithUrls.filter(a =>  a.file_path.includes('/admin/'))

  // Fetch response templates and institution name for UI
  const [templates, institutionResult] = await Promise.all([
    getResponseTemplates(),
    supabaseAdmin.from('institutions').select('name').eq('id', request.institution_id).single()
  ])
  const institutionName = institutionResult.data?.name || 'Salud360'

  // Server Action
  async function updateStatus(formData: FormData) {
    'use server'
    const newStatus     = formData.get('status') as string
    const comment       = formData.get('comment') as string
    const fileEntries   = formData.getAll('attachments') as File[]
    const validFiles    = fileEntries.filter(f => f.size > 0)
    const apptDate      = formData.get('appt_date') as string
    const apptTime      = formData.get('appt_time') as string
    const apptDoctor    = formData.get('appt_doctor') as string
    const apptSpecialty = formData.get('appt_specialty') as string

    const sbAdm = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const sbRLS = await createClient()
    const { data: { user } } = await sbRLS.auth.getUser()

    const resendAttachments: Array<{ filename: string, content: Buffer }> = []

    // ── Upload admin files to MinIO ─────────────────────────────────────────
    if (validFiles.length > 0) {
      const s3Client = new S3Client({
        region: 'us-east-1',
        endpoint: process.env.MINIO_ENDPOINT,
        credentials: { accessKeyId: process.env.MINIO_ACCESS_KEY!, secretAccessKey: process.env.MINIO_SECRET_KEY! },
        forcePathStyle: true
      })
      for (const file of validFiles) {
        const ext        = file.name.split('.').pop()
        const safeName   = `${Math.random().toString(36).substring(7)}.${ext}`
        const uploadPath = `${request.institution_id}/${request.id}/admin/${safeName}`
        try {
          const buffer = Buffer.from(await file.arrayBuffer())
          await s3Client.send(new PutObjectCommand({ Bucket: process.env.MINIO_BUCKET_NAME!, Key: uploadPath, Body: buffer, ContentType: file.type }))
          await sbAdm.from('request_attachments').insert({ request_id: request.id, file_name: file.name, file_path: uploadPath, file_type: file.type, file_size: file.size })
          resendAttachments.push({ filename: file.name, content: buffer })
        } catch (e) { console.error('Admin file upload fail:', e) }
      }
    }

    // ── Save appointment if provided ────────────────────────────────────────
    if (apptDate && apptTime) {
      await sbAdm.from('appointments').insert({
        request_id: request.id, appointment_date: apptDate, appointment_time: apptTime,
        doctor_name: apptDoctor || null, specialty: apptSpecialty || null,
        reminder_24h_sent: false, reminder_2h_sent: false
      })
      const { data: inst } = await sbAdm.from('institutions').select('name').eq('id', request.institution_id).single()
      const patientName = request.patient_data_json?.fullName || 'Paciente'
      await sendAppointmentConfirmationEmail(
        request.patient_email, patientName, request.radicado,
        { date: apptDate, time: apptTime, doctor: apptDoctor || '', specialty: apptSpecialty || '', institution: inst?.name || 'Salud360' }
      )
    }

    // ── Update status + history ─────────────────────────────────────────────
    await sbAdm.from('requests').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', request.id)
    await sbAdm.from('request_history').insert({
      request_id: request.id,
      action: `Estado actualizado a ${STATUS_MAP[newStatus]?.label || newStatus}${apptDate ? ` · Cita: ${apptDate} ${apptTime}` : ''}`,
      from_status: request.status, to_status: newStatus,
      user_id: user?.id, comment: comment || null
    })
    if (['responded', 'closed', 'escalated'].includes(newStatus)) {
      await sendStatusUpdateEmail(request.patient_email, request.radicado, newStatus, comment, resendAttachments)
    }
    revalidatePath(`/admin/requests/${request.id}`)
  }


  // Sorted history (newest first)
  const history = [...(request.request_history || [])].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button asChild variant="outline" size="icon" className="shrink-0">
            <Link href="/admin/requests"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Solicitud</h1>
              <span className="font-mono text-lg font-bold text-teal-700 bg-teal-50 px-3 py-0.5 rounded-full border border-teal-200">
                {request.radicado}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${statusInfo.color}`}>
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Radicada el {format(new Date(request.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
              {' · '}{request.type}
            </p>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Patient Info + Dynamic Fields + Attachments */}
          <div className="lg:col-span-2 space-y-6">

            {/* Patient Identity Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <User className="h-4 w-4 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Información del Paciente</h2>
              </div>
              <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-5">
                <FieldValue label="Nombre Completo" value={fullName} />
                <FieldValue label="Documento" value={`${request.patient_document_type} ${request.patient_document_number}`} />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Mail className="h-3 w-3" />Correo Electrónico</p>
                  <a href={`mailto:${request.patient_email}`} className="text-sm font-medium text-teal-700 hover:underline break-all">{request.patient_email}</a>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Phone className="h-3 w-3" />Teléfono</p>
                  <p className="text-sm font-medium text-slate-800">{phone}</p>
                </div>
              </div>
            </div>

            {/* Dynamic Request Fields */}
            {dynamicFields.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-teal-600" />
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Detalle del Requerimiento</h2>
                  <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{request.type}</span>
                </div>
                <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  {dynamicFields.map(([key, value]) => {
                    const stringValue = String(value || '—')
                    return (
                      <div key={key} className={stringValue.length > 80 ? 'col-span-2' : ''}>
                        <FieldValue label={key} value={stringValue} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Attachments (Patient) */}
            {patientAttachments.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-teal-600" />
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Documentos del Paciente
                  </h2>
                  <span className="ml-auto text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5 font-semibold">
                    {patientAttachments.length} archivo{patientAttachments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {patientAttachments.map((file: any) => {
                    const isImage = file.file_type?.startsWith('image/')
                    const isPdf  = file.file_type === 'application/pdf'
                    const sizeMb = (file.file_size / 1024 / 1024).toFixed(2)
                    return (
                      <div key={file.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        {/* Image preview */}
                        {isImage && file.signedUrl && (
                          <div className="relative bg-slate-100 max-h-72 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={file.signedUrl}
                              alt={file.file_name}
                              className="w-full object-contain max-h-72"
                            />
                          </div>
                        )}
                        {/* PDF / generic */}
                        {isPdf && (
                          <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center gap-3">
                            <div className="bg-red-100 rounded-lg p-2">
                              <FileText className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-red-800">Documento PDF</p>
                              <p className="text-xs text-red-600">{sizeMb} MB</p>
                            </div>
                          </div>
                        )}
                        {/* File footer */}
                        <div className="px-4 py-3 flex items-center justify-between bg-white">
                          <div>
                            <p className="text-sm font-medium text-slate-800 truncate max-w-xs">{file.file_name}</p>
                            <p className="text-xs text-slate-400">{sizeMb} MB · {file.file_type}</p>
                          </div>
                          {file.signedUrl && (
                            <a
                              href={file.signedUrl}
                              download={file.file_name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Descargar
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Attachments (Admin) */}
            {adminAttachments.length > 0 && (
              <div className="bg-white rounded-2xl border border-teal-200 shadow-sm overflow-hidden bg-teal-50/30">
                <div className="px-6 py-4 border-b border-teal-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-teal-700" />
                  <h2 className="text-sm font-bold text-teal-800 uppercase tracking-wider">
                    Adjuntos de Respuesta (Clínica)
                  </h2>
                  <span className="ml-auto text-xs bg-teal-100 text-teal-800 border border-teal-200 rounded-full px-2 py-0.5 font-semibold">
                    {adminAttachments.length} archivo{adminAttachments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {adminAttachments.map((file: any) => {
                    const isImage = file.file_type?.startsWith('image/')
                    const isPdf  = file.file_type === 'application/pdf'
                    const sizeMb = (file.file_size / 1024 / 1024).toFixed(2)
                    return (
                      <div key={file.id} className="border border-teal-200 rounded-xl overflow-hidden bg-white">
                        {isImage && file.signedUrl && (
                          <div className="relative bg-teal-50 max-h-72 overflow-hidden border-b border-teal-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={file.signedUrl}
                              alt={file.file_name}
                              className="w-full object-contain max-h-72"
                            />
                          </div>
                        )}
                        {isPdf && (
                          <div className="bg-teal-50 border-b border-teal-100 px-4 py-3 flex items-center gap-3">
                            <div className="bg-teal-100 rounded-lg p-2">
                              <FileText className="h-5 w-5 text-teal-700" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-teal-900">Documento PDF</p>
                              <p className="text-xs text-teal-700">{sizeMb} MB</p>
                            </div>
                          </div>
                        )}
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-800 truncate max-w-xs">{file.file_name}</p>
                            <p className="text-xs text-slate-400">{sizeMb} MB · {file.file_type}</p>
                          </div>
                          {file.signedUrl && (
                            <a
                              href={file.signedUrl}
                              download={file.file_name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Descargar
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Status Management + History */}
          <div className="space-y-6">

            {/* Status Management */}
            <div className="bg-white rounded-2xl border border-teal-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-teal-900">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Gestión de Estado</h2>
                <p className="text-teal-200 text-xs mt-0.5">El paciente será notificado por correo al responder o cerrar</p>
              </div>
              <div className="px-6 py-5">
                <StatusManagementForm
                  action={updateStatus}
                  templates={templates}
                  currentStatus={request.status}
                  requestData={{
                    patientName: fullName,
                    radicado: request.radicado,
                    institution: institutionName
                  }}
                />
              </div>
            </div>

            {/* History Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Historial</h2>
              </div>
              <div className="px-6 py-5">
                {history.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Sin historial aún.</p>
                ) : (
                  <ol className="relative border-l border-slate-200 space-y-5">
                    {history.map((hist: any) => {
                      const histStatus = STATUS_MAP[hist.to_status]
                      return (
                        <li key={hist.id} className="ml-4">
                          <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-teal-500 border-2 border-white shadow" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{hist.action}</p>
                            <time className="text-xs text-slate-400 block mb-1">
                              {format(new Date(hist.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                            </time>
                            {hist.comment && (
                              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mt-1">
                                {hist.comment}
                              </p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

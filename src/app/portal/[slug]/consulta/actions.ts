'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { sendWhatsAppMessage } from '@/lib/evolution'
import { sendPortalCancellationNotification } from '@/lib/resend'

export type TrackResult = {
  success: boolean
  message?: string
  data?: any
  multipleResults?: any[]
}

export async function trackRequest(slug: string, prevState: any, formData: FormData): Promise<TrackResult> {
  const radicado       = (formData.get('radicado') as string || '').trim().toUpperCase()
  const documentNumber = (formData.get('documentNumber') as string || '').trim()

  if (!radicado && !documentNumber) {
    return { success: false, message: 'Ingresa tu número de documento o tu número de radicado para buscar.' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Resolve institution by slug
  const { data: inst } = await supabase
    .from('institutions')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!inst) {
    return { success: false, message: 'Institución no encontrada.' }
  }

  const BASE_SELECT = `
    id, radicado, type, status, created_at, institution_id, patient_email, patient_data_json,
    request_history ( id, action, created_at, comment, from_status, to_status ),
    appointments ( id, appointment_date, appointment_time, doctor_name, specialty, branch_name, attended, cancelled, cancelled_at, cancellation_reason, rescheduled, rescheduled_at, rescheduled_reason, rescheduled_from_id )
  `

  // ── Mode 1: Both fields — exact single match ─────────────────────────────
  if (radicado && documentNumber) {
    const { data: request, error } = await supabase
      .from('requests')
      .select(BASE_SELECT)
      .eq('radicado', radicado)
      .eq('patient_document_number', documentNumber)
      .eq('institution_id', inst.id)
      .single()

    if (error || !request) {
      return { success: false, message: 'No encontramos ninguna solicitud con ese radicado y número de documento. Verifica los datos e intenta nuevamente.' }
    }

    return { success: true, data: withSortedHistory(request) }
  }

  // ── Mode 2: Only radicado ────────────────────────────────────────────────
  if (radicado) {
    const { data: request, error } = await supabase
      .from('requests')
      .select(BASE_SELECT)
      .eq('radicado', radicado)
      .eq('institution_id', inst.id)
      .single()

    if (error || !request) {
      return { success: false, message: `No encontramos el radicado "${radicado}" en esta institución. Verifica que esté escrito correctamente.` }
    }

    return { success: true, data: withSortedHistory(request) }
  }

  // ── Mode 3: Only document — may return multiple ──────────────────────────
  const { data: requests, error } = await supabase
    .from('requests')
    .select(BASE_SELECT)
    .eq('patient_document_number', documentNumber)
    .eq('institution_id', inst.id)
    .order('created_at', { ascending: false })

  if (error || !requests || requests.length === 0) {
    return { success: false, message: `No encontramos solicitudes registradas para el documento "${documentNumber}" en esta institución. Si radicaste recientemente, espera unos minutos e intenta de nuevo.` }
  }

  if (requests.length === 1) {
    return { success: true, data: withSortedHistory(requests[0]) }
  }

  // Multiple — return list so patient can pick one
  return {
    success: true,
    multipleResults: requests.map(r => ({
      id: r.id,
      radicado: r.radicado,
      type: r.type,
      status: r.status,
      created_at: r.created_at,
      request_history: sortHistory(r.request_history || []),
      appointments: r.appointments || [],
    })),
  }
}

function sortHistory(history: any[]) {
  return [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

function withSortedHistory(request: any) {
  return { 
    ...request, 
    request_history: sortHistory(request.request_history || []),
    appointments: request.appointments || []
  }
}

export async function cancelPatientAppointmentFromPortal(
  appointmentId: string,
  reason: string,
  slug: string
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!appointmentId || !reason) {
      return { success: false, message: 'Falta el identificador de la cita o el motivo de cancelación.' }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Fetch appointment with request and institution
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('*, requests ( id, radicado, patient_email, patient_data_json, institution_id, institutions ( id, name, slug, contact_email, evolution_instance_name, evolution_connected, colors, logo_url ) )')
      .eq('id', appointmentId)
      .single()

    if (apptErr || !appt) {
      return { success: false, message: 'No se encontró la cita solicitada.' }
    }

    if (appt.cancelled) {
      return { success: false, message: 'Esta cita ya se encontraba cancelada previamente.' }
    }

    // 2. Mark appointment as cancelled
    const { error: updateErr } = await supabase
      .from('appointments')
      .update({
        cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: `Cancelada por el paciente (Portal Web): ${reason}`,
        cancelled_by: null,
      })
      .eq('id', appointmentId)

    if (updateErr) {
      console.error('Error updating appointment:', updateErr)
      return { success: false, message: 'Ocurrió un error al intentar cancelar la cita. Inténtalo nuevamente.' }
    }

    const req = appt.requests
    const inst = req?.institutions

    // 3. Insert into request_history
    if (req) {
      await supabase.from('request_history').insert({
        request_id: req.id,
        action: '❌ Cita Cancelada por el Paciente',
        from_status: 'none',
        to_status: 'processing',
        comment: `El paciente anuló su cita del ${appt.appointment_date} a las ${appt.appointment_time} con ${appt.doctor_name || 'médico asignado'}. Motivo registrado: ${reason}`,
      })
    }

    // 4. Notifications
    if (req && inst) {
      const patientName = req.patient_data_json?.fullName || 'Paciente'
      const patientPhone = req.patient_data_json?.phone
      const patientEmail = req.patient_email || req.patient_data_json?.email
      const radicado = req.radicado || '—'

      // a) WhatsApp Notification
      if (inst.evolution_connected && inst.evolution_instance_name && patientPhone) {
        const wpText = `🚫 *NOTIFICACIÓN DE CANCELACIÓN*\n\nHola *${patientName}*,\n\nConfirmamos que tu cita médica en *${inst.name}* ha sido *CANCELADA* exitosamente según tu solicitud desde el portal web.\n\n📅 *Fecha programada:* ${appt.appointment_date}\n🕐 *Hora:* ${appt.appointment_time}\n👨‍⚕️ *Médico:* ${appt.doctor_name || 'Por asignar'} (${appt.specialty || 'General'})\n📋 *Motivo:* ${reason}\n🔢 *Radicado:* ${radicado}\n\nEl espacio ha sido liberado de nuestra agenda y no recibirás más recordatorios automáticos de esta cita. Si deseas reagendar, puedes ingresar cuando quieras a nuestro portal en línea.\n\n_Mensaje automático de ${inst.name}._`

        const wpRes = await sendWhatsAppMessage(inst.evolution_instance_name, { number: patientPhone, text: wpText })
        await supabase.from('whatsapp_logs').insert({
          appointment_id: appointmentId,
          patient_phone: patientPhone,
          message_type: 'cancellation_portal',
          status: wpRes ? 'sent' : 'failed',
          error_message: wpRes ? null : 'Fallo envío de WhatsApp por Evolution API',
        })
      }

      // b) Email to Patient
      if (patientEmail) {
        try {
          await sendPortalCancellationNotification(
            patientEmail,
            radicado,
            patientName,
            appt.appointment_date,
            appt.appointment_time,
            appt.doctor_name || 'No asignado',
            appt.specialty || 'General',
            reason,
            false,
            inst
          )
        } catch (e) { console.error('Error email paciente:', e) }
      }

      // c) Email to Gestores (Institution contact_email)
      if (inst.contact_email) {
        try {
          await sendPortalCancellationNotification(
            inst.contact_email,
            radicado,
            patientName,
            appt.appointment_date,
            appt.appointment_time,
            appt.doctor_name || 'No asignado',
            appt.specialty || 'General',
            reason,
            true,
            inst
          )
        } catch (e) { console.error('Error email gestor:', e) }
      }
    }

    revalidatePath(`/portal/${slug}/consulta`)
    revalidatePath('/admin/appointments')
    revalidatePath('/admin/requests')

    return { success: true, message: 'Tu cita ha sido cancelada exitosamente y se ha notificado a los gestores de la institución.' }
  } catch (err: any) {
    console.error('cancelPatientAppointmentFromPortal exception:', err)
    return { success: false, message: 'Ocurrió un error inesperado al procesar tu solicitud.' }
  }
}


'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function sb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface AppointmentWithPatient {
  id: string
  request_id: string
  appointment_date: string
  appointment_time: string
  doctor_name: string | null
  specialty: string | null
  attended: boolean | null
  attended_at: string | null
  attendance_notes: string | null
  attended_by: string | null
  reminder_24h_sent: boolean
  reminder_2h_sent: boolean
  patient_name: string
  patient_email: string
  radicado: string
  request_type: string
  institution_name: string
}

export async function getAppointmentsByDate(date: string): Promise<AppointmentWithPatient[]> {
  try {
    const supabase = sb()

    // Step 1: Fetch appointments for the date
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('*')
      .eq('appointment_date', date)
      .order('appointment_time', { ascending: true })

    if (apptError) {
      console.error('Error fetching appointments:', apptError)
      return []
    }
    if (!appointments || appointments.length === 0) return []

    // Step 2: Fetch related requests
    const requestIds = appointments.map((a: any) => a.request_id)
    const { data: requests, error: reqError } = await supabase
      .from('requests')
      .select('id, radicado, type, patient_email, patient_data_json, institution_id')
      .in('id', requestIds)

    if (reqError) {
      console.error('Error fetching requests:', reqError)
      return []
    }

    // Step 3: Fetch institution names
    const institutionIds = [...new Set((requests || []).map((r: any) => r.institution_id).filter(Boolean))]
    let institutionMap: Record<string, string> = {}
    if (institutionIds.length > 0) {
      const { data: institutions } = await supabase
        .from('institutions')
        .select('id, name')
        .in('id', institutionIds)
      for (const inst of institutions || []) {
        institutionMap[(inst as any).id] = (inst as any).name
      }
    }

    // Step 4: Build a map of requests
    const requestMap: Record<string, any> = {}
    for (const req of (requests || [])) {
      requestMap[(req as any).id] = req
    }

    // Step 5: Merge
    return appointments.map((appt: any) => {
      const req = requestMap[appt.request_id] || {}
      const patientJson = req.patient_data_json || {}
      return {
        id:               appt.id,
        request_id:       appt.request_id,
        appointment_date: appt.appointment_date,
        appointment_time: appt.appointment_time,
        doctor_name:      appt.doctor_name      ?? null,
        specialty:        appt.specialty        ?? null,
        attended:         appt.attended         ?? null,
        attended_at:      appt.attended_at      ?? null,
        attendance_notes: appt.attendance_notes ?? null,
        attended_by:      appt.attended_by      ?? null,
        reminder_24h_sent: appt.reminder_24h_sent ?? false,
        reminder_2h_sent:  appt.reminder_2h_sent  ?? false,
        patient_name:     patientJson.fullName || 'Paciente',
        patient_email:    req.patient_email || patientJson.email || '—',
        radicado:         req.radicado      || '—',
        request_type:     req.type          || '—',
        institution_name: institutionMap[req.institution_id] || 'Sin institución'
      }
    })
  } catch (err) {
    console.error('getAppointmentsByDate exception:', err)
    return []
  }
}

export async function markAttendance(
  appointmentId: string,
  attended: boolean,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sbRLS = await createClient()
    const { data: { user } } = await sbRLS.auth.getUser()

    const { error } = await sb()
      .from('appointments')
      .update({
        attended,
        attended_at: new Date().toISOString(),
        attended_by: user?.id || null,
        attendance_notes: notes || null
      })
      .eq('id', appointmentId)

    if (error) { console.error(error); return { success: false, error: error.message } }
    revalidatePath('/admin/appointments')
    return { success: true }
  } catch (err: any) {
    console.error('markAttendance exception:', err)
    return { success: false, error: err?.message || 'Error desconocido' }
  }
}

export async function resetAttendance(appointmentId: string): Promise<{ success: boolean }> {
  try {
    const { error } = await sb()
      .from('appointments')
      .update({ attended: null, attended_at: null, attended_by: null, attendance_notes: null })
      .eq('id', appointmentId)

    if (error) return { success: false }
    revalidatePath('/admin/appointments')
    return { success: true }
  } catch {
    return { success: false }
  }
}

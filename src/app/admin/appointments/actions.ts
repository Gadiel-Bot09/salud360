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
  requests: {
    radicado: string
    type: string
    patient_email: string
    patient_data_json: Record<string, string>
    institutions: { name: string } | null
  }
}

export async function getAppointmentsByDate(date: string): Promise<AppointmentWithPatient[]> {
  const { data, error } = await sb()
    .from('appointments')
    .select(`
      id, request_id, appointment_date, appointment_time,
      doctor_name, specialty, attended, attended_at, attendance_notes, attended_by,
      reminder_24h_sent, reminder_2h_sent,
      requests ( radicado, type, patient_email, patient_data_json, institutions(name) )
    `)
    .eq('appointment_date', date)
    .order('appointment_time', { ascending: true })

  if (error) { console.error(error); return [] }
  return (data || []) as any[]
}

export async function markAttendance(
  appointmentId: string,
  attended: boolean,
  notes: string
): Promise<{ success: boolean; error?: string }> {
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
}

export async function resetAttendance(appointmentId: string): Promise<{ success: boolean }> {
  const { error } = await sb()
    .from('appointments')
    .update({ attended: null, attended_at: null, attended_by: null, attendance_notes: null })
    .eq('id', appointmentId)

  if (error) return { success: false }
  revalidatePath('/admin/appointments')
  return { success: true }
}

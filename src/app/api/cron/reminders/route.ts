import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAppointmentReminderEmail } from '@/lib/resend'
import { sendWhatsAppMessage } from '@/lib/evolution'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Protect endpoint with CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  let sent24h = 0
  let sent2h  = 0
  let errors  = 0

  try {
    // ── Window for 24h reminder: cita between 23h and 25h from now ──────────
    // 2h wide → guarantees any appointment is caught in at least one hourly run
    const win24hFrom = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const win24hTo   = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    // ── Window for 2h reminder: cita between 1h and 3h from now ─────────────
    // 2h wide (not ±15min) → guarantees appointments at ANY minute (e.g. 10:20, 9:15)
    // are caught by at least one hourly cron run.
    // The reminder_2h_sent flag prevents double-sending if multiple runs overlap.
    const win2hFrom  = new Date(now.getTime() + 1 * 60 * 60 * 1000)
    const win2hTo    = new Date(now.getTime() + 3 * 60 * 60 * 1000)

    const toDateStr = (d: Date) => d.toISOString().split('T')[0]
    const toTimeStr = (d: Date) => d.toTimeString().slice(0, 5) // HH:MM

    // Fetch all pending appointments with related request data
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id, appointment_date, appointment_time, doctor_name, specialty,
        reminder_24h_sent, reminder_2h_sent,
        requests ( id, radicado, patient_email, patient_data_json, institutions(name) )
      `)
      .or('reminder_24h_sent.eq.false,reminder_2h_sent.eq.false')

    if (fetchError) throw fetchError

    for (const appt of (appointments || []) as any[]) {
      const req         = appt.requests
      if (!req) continue

      const patientName  = req.patient_data_json?.fullName || 'Paciente'
      const patientPhone = req.patient_data_json?.phone
      const toEmail      = req.patient_email
      const institution  = req.institutions?.name || 'Salud360'
      const appointmentData = {
        date:      appt.appointment_date,
        time:      appt.appointment_time?.slice(0, 5) || '—',
        doctor:    appt.doctor_name || '',
        specialty: appt.specialty || '',
        institution
      }

      // Combine appointment date+time as Colombia time (UTC-5, always fixed — no DST)
      // Without the offset, new Date('2026-04-15T10:00') is treated as UTC,
      // meaning a 10:00 Colombia cita would fire at 5:00 AM Colombia — wrong.
      const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}:00-05:00`)

      // ── Check 24h window ─────────────────────────────────────────────────
      if (!appt.reminder_24h_sent && apptDateTime >= win24hFrom && apptDateTime <= win24hTo) {
        try {
          await sendAppointmentReminderEmail(toEmail, patientName, req.radicado, appointmentData, 24)
          
          if (patientPhone && patientPhone !== '—') {
            const timeStr = appt.appointment_time?.slice(0, 5) || '—'
            const doctorStr = appt.doctor_name ? `con el especialista ${appt.doctor_name}` : ''
            const text = `Hola ${patientName},\n\nTe recordamos que mañana tienes una cita médica en *${institution}* a las *${timeStr}* ${doctorStr}.\n\nPor favor, llega con 15 minutos de antelación.\n\nAtentamente,\nEquipo de ${institution}`
            await sendWhatsAppMessage('default', {
              number: patientPhone.replace(/\D/g, ''),
              text
            })
          }

          await supabase.from('appointments').update({ reminder_24h_sent: true }).eq('id', appt.id)
          sent24h++
        } catch (e) {
          console.error('24h reminder error for', appt.id, e)
          errors++
        }
      }

      // ── Check 2h window ──────────────────────────────────────────────────
      if (!appt.reminder_2h_sent && apptDateTime >= win2hFrom && apptDateTime <= win2hTo) {
        try {
          await sendAppointmentReminderEmail(toEmail, patientName, req.radicado, appointmentData, 2)
          
          if (patientPhone && patientPhone !== '—') {
            const timeStr = appt.appointment_time?.slice(0, 5) || '—'
            const doctorStr = appt.doctor_name ? `con el especialista ${appt.doctor_name}` : ''
            const text = `Hola ${patientName},\n\nEste es un recordatorio final para tu cita médica de hoy en *${institution}* a las *${timeStr}* ${doctorStr}.\n\nTe esperamos pronto.\n\nAtentamente,\nEquipo de ${institution}`
            await sendWhatsAppMessage('default', {
              number: patientPhone.replace(/\D/g, ''),
              text
            })
          }

          await supabase.from('appointments').update({ reminder_2h_sent: true }).eq('id', appt.id)
          sent2h++
        } catch (e) {
          console.error('2h reminder error for', appt.id, e)
          errors++
        }
      }
    }

    console.log(`Cron reminders: 24h=${sent24h}, 2h=${sent2h}, errors=${errors}`)
    return NextResponse.json({
      success: true,
      processed: (appointments || []).length,
      sent_24h: sent24h,
      sent_2h:  sent2h,
      errors
    })
  } catch (error: any) {
    console.error('Cron reminder fatal error:', error)
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}

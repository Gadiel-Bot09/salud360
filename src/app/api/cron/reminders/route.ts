import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// import twilio from 'twilio'

// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export async function GET(request: Request) {
    // This endpoint should be protected by a static secret from cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    try {
        // Logic: Fetch appointments in the next 24h where reminder_24h_sent = false
        // Logic: Fetch appointments in the next 2h where reminder_2h_sent = false

        // For MVP, simulating the logic since Twilio setup requires strict templates 
        // and phone number validations mapping.

        /*
        const { data: upcoming24h } = await supabase
           .from('appointments')
           .select('*, requests(radicado, patient_data_json)')
           .eq('reminder_24h_sent', false)
           // .lte('appointment_date', next24h) etc...
           
        for(const appt of upcoming24h) {
           await client.messages.create({
              from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
              to: `whatsapp:+57${appt.requests.patient_data_json.phone}`,
              body: `Hola, le recordamos su cita mañana... Radicado: ${appt.requests.radicado}`
           })
           await supabase.from('appointments').update({ reminder_24h_sent: true }).eq('id', appt.id)
        }
        */

        console.log('Cron job ran: WhatsApp reminders evaluated.')
        return NextResponse.json({ success: true, message: 'Reminders processed' })
    } catch (error) {
        console.error('Error in WhatsApp Cron:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

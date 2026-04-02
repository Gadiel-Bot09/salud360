import { Resend } from 'resend'

// Fallback key to prevent Next.js static build fail when env vars are missing
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_fallback_key')

export async function sendEmailConfirmation(
    toEmail: string,
    radicado: string,
    patientName: string,
    requestType: string
) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not set. Cannot send email.')
        return null
    }

    const htmlBody = `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #0f766e;">Confirmación de Solicitud - Salud360</h2>
      <p>Hola <strong>${patientName}</strong>,</p>
      <p>Hemos recibido satisfactoriamente su solicitud de <strong>${requestType}</strong>.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
         <p style="margin: 0; font-size: 14px; color: #64748b;">Número de Radicado</p>
         <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 1px; color: #0f172a;">${radicado}</p>
      </div>

      <p>Por favor guarde este número para consultar el estado de su trámite.</p>
      <p>Estaremos en contacto pronto,<br/>Equipo Salud360</p>
    </div>
  `

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Salud360 <noreply@salud360.app>',
            to: [toEmail],
            subject: `Solicitud Recibida - Radicado ${radicado}`,
            html: htmlBody,
        })

        if (error) {
            console.error('Error sending resend email:', error)
        }
        return data
    } catch (error) {
        console.error('Exception sending email:', error)
        return null
    }
}

export async function sendStatusUpdateEmail(
    toEmail: string,
    radicado: string,
    newStatus: string,
    comment?: string
) {
    if (!process.env.RESEND_API_KEY) return null;

    const statusMap: Record<string, string> = {
        'processing': 'En Trámite',
        'responded': 'Respondida',
        'closed': 'Cerrada',
        'escalated': 'Escalada'
    }

    const htmlBody = `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #0f766e;">Actualización de Estado - Salud360</h2>
      <p>El estado de su radicado <strong>${radicado}</strong> ha sido actualizado.</p>
      
      <p>Nuevo Estado: <strong style="color: #0284c7;">${statusMap[newStatus] || newStatus}</strong></p>
      
      ${comment ? `<div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #0ea5e9; margin: 15px 0;"><p style="margin:0">${comment}</p></div>` : ''}

      <p>Puede consultar más detalles en el portal.</p>
      <p>Atentamente,<br/>Equipo Salud360</p>
    </div>
  `

    try {
        const { data } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Salud360 <noreply@salud360.app>',
            to: [toEmail],
            subject: `Actualización de Solicitud ${radicado}`,
            html: htmlBody,
        })
        return data
    } catch (err) {
        console.error('Error updating status email via resend', err)
        return null
    }
}

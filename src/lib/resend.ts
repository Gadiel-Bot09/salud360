import { Resend } from 'resend'

// Fallback key to prevent Next.js static build fail when env vars are missing
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_fallback_key')

export async function sendEmailConfirmation(
    toEmail: string,
    radicado: string,
    patientName: string,
    requestType: string,
    patientData: Record<string, string> = {}
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

      <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
        <div style="background-color: #f1f5f9; padding: 12px 15px; border-bottom: 1px solid #e2e8f0;">
          <h3 style="margin: 0; font-size: 15px; color: #334155;">Detalle de la Solicitud</h3>
        </div>
        <div style="padding: 15px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tbody>
              ${Object.entries(patientData)
                .filter(([key]) => key !== 'fullName' && key !== 'phone' && key !== 'email' && key !== 'documentType' && key !== 'documentNumber')
                .map(([key, value]) => `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 40%;"><strong>${key}</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 500;">${value || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <p>Por favor guarde este número para consultar el estado de su trámite.</p>
      <p>Estaremos en contacto pronto,<br/>Equipo Salud360</p>
    </div>
  `

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Salud360 <noreply@mail.sinuhub.com>',
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
    comment?: string,
    attachments?: Array<{ filename: string, content: Buffer }>
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
            from: process.env.RESEND_FROM_EMAIL || 'Salud360 <noreply@mail.sinuhub.com>',
            to: [toEmail],
            subject: `Actualización de Solicitud ${radicado}`,
            html: htmlBody,
            attachments: attachments || []
        })
        return data
    } catch (err) {
        console.error('Error updating status email via resend', err)
        return null
    }
}

export async function sendWelcomeAdminEmail(
    toEmail: string,
    tempPassword: string,
    role: string,
    institutionName: string | null,
    loginUrl: string
) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not set. Cannot send welcome email.')
        return null
    }

    const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
      <div style="background: linear-gradient(135deg, #0f766e, #0369a1); padding: 32px 40px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">¡Bienvenido a Salud360!</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Panel Administrativo de Gestión Médica</p>
      </div>
      
      <div style="background: #f8fafc; padding: 32px 40px; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 16px 0;">Se ha creado una cuenta de administrador para ti en la plataforma Salud360${institutionName ? ` como parte de <strong>${institutionName}</strong>` : ''}.</p>
        
        <p style="margin: 0 0 8px 0; font-weight: 600;">Tu rol asignado: <span style="color: #0f766e;">${role}</span></p>
        
        <div style="background: white; border: 2px solid #e2e8f0; border-radius: 10px; padding: 24px; margin: 20px 0;">
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Tus Credenciales de Acceso</p>
          <p style="margin: 0 0 8px 0;"><strong>Correo:</strong> ${toEmail}</p>
          <div style="background: #0f172a; border-radius: 8px; padding: 12px 16px; margin-top: 12px;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">Contraseña Temporal</p>
            <p style="margin: 0; color: #34d399; font-family: monospace; font-size: 20px; font-weight: bold; letter-spacing: 2px;">${tempPassword}</p>
          </div>
        </div>
        
        <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #854d0e; font-size: 13px;">⚠️ <strong>Importante:</strong> Por seguridad, cambia esta contraseña en tu primera sesión desde <em>Configuración → Seguridad</em>.</p>
        </div>
        
        <a href="${loginUrl}" style="display: inline-block; background: #0f766e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Ingresar al Panel →
        </a>
        
        <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 12px;">Si no reconoces esta solicitud, ignora este correo. Las credenciales expiran en 72 horas sin uso.</p>
      </div>
      
      <div style="padding: 16px 40px; text-align: center;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Salud360 · Panel Administrativo</p>
      </div>
    </div>
  `

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Salud360 <noreply@mail.sinuhub.com>',
            to: [toEmail],
            subject: '🏥 Bienvenido a Salud360 — Tus Credenciales de Acceso',
            html: htmlBody,
        })
        if (error) console.error('Error sending welcome email:', error)
        return data
    } catch (err) {
        console.error('Exception sending welcome email:', err)
        return null
    }
}

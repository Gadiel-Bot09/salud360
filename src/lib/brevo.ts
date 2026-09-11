import { createClient } from '@supabase/supabase-js'

// ── Brevo transactional email via REST API ─────────────────────────────────────
// Drop-in replacement for resend.ts — all function signatures are identical.
// Set BREVO_API_KEY in Vercel/env. Keep RESEND_FROM_EMAIL or add BREVO_FROM_EMAIL.

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

// ── Supabase admin client for logging (service role, server-only) ─────────────
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// ── Core send function ─────────────────────────────────────────────────────────
async function sendEmail({
  to,
  subject,
  html,
  attachments,
  templateName,
}: {
  to: string
  subject: string
  html: string
  attachments?: Array<{ filename: string; content: Buffer }>
  templateName?: string
}): Promise<{ id?: string } | null> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.warn('BREVO_API_KEY not set. Cannot send email.')
    return null
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Salud360 <noreply@mail.sinuhub.com>'
  // Parse "Name <email>" format
  const fromMatch = fromEmail.match(/^(.+?)\s*<(.+?)>$/)
  const senderName  = fromMatch ? fromMatch[1].trim() : 'Salud360'
  const senderEmail = fromMatch ? fromMatch[2].trim() : fromEmail.trim()

  const payload: Record<string, unknown> = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  }

  // Brevo attachments format: base64 content
  if (attachments && attachments.length > 0) {
    payload.attachment = attachments.map((a) => ({
      name: a.filename,
      content: a.content.toString('base64'),
    }))
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const body = await res.json()

    if (!res.ok) {
      console.error(`Brevo API error ${res.status}:`, body)
      await logEmail(to, subject, templateName, 'error')
      return null
    }

    await logEmail(to, subject, templateName, 'sent')
    return { id: body.messageId }
  } catch (err) {
    console.error('Exception calling Brevo API:', err)
    await logEmail(to, subject, templateName, 'error')
    return null
  }
}

// ── Email logger — saves to email_logs table for daily counter ────────────────
async function logEmail(
  toEmail: string,
  subject: string,
  templateName?: string,
  status: 'sent' | 'error' = 'sent'
) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) return
    await supabase.from('email_logs').insert({
      to_email: toEmail,
      subject,
      template_name: templateName || 'generic',
      status,
    })
  } catch (err) {
    // Non-critical: never let a log failure break the app
    console.warn('Could not log email to DB:', err)
  }
}

// ── Institution branding type ─────────────────────────────────────────────────
export interface EmailInstitution {
  name: string
  logo_url?: string | null
  colors?: { primary?: string; secondary?: string } | null
}

// ── Shared branded layout builder ─────────────────────────────────────────────
function emailLayout(
  institution: EmailInstitution | null | undefined,
  headerEmoji: string,
  headerTitle: string,
  headerSubtitle: string,
  bodyHtml: string
): string {
  const inst      = institution || { name: 'Salud360' }
  const primary   = inst.colors?.primary   || '#0f766e'
  const secondary = inst.colors?.secondary || '#0c4a6e'
  const name      = inst.name || 'Salud360'
  const logoUrl   = inst.logo_url

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${name}" style="height:48px;max-width:160px;object-fit:contain;border-radius:8px;background:rgba(255,255,255,0.15);padding:6px;" />`
    : `<div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:white;vertical-align:middle;">${name.charAt(0).toUpperCase()}</div>`

  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;background:#f1f5f9;padding:24px 0;">
    <div style="background:linear-gradient(135deg,${primary} 0%,${secondary} 100%);padding:28px 40px;border-radius:16px 16px 0 0;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
        ${logoHtml}
        <div>
          <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2px;">Institución de Salud</div>
          <div style="font-size:17px;font-weight:800;color:white;line-height:1.2;">${name}</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:16px 20px;">
        <div style="font-size:22px;font-weight:900;color:white;margin-bottom:4px;">${headerEmoji} ${headerTitle}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.75);">${headerSubtitle}</div>
      </div>
    </div>
    <div style="background:#ffffff;padding:32px 40px;border:1px solid #e2e8f0;border-top:none;">
      ${bodyHtml}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:16px 40px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        Correo enviado por <strong style="color:#64748b;">${name}</strong> · Administrado por Salud360
        <br/>© ${new Date().getFullYear()} · Sistema de Gestión Médica Digital
      </p>
    </div>
  </div>`
}

// ── Info row helper ────────────────────────────────────────────────────────────
function infoRow(label: string, value: string, last = false): string {
  return `
  <tr>
    <td style="padding:11px 0;${last ? '' : 'border-bottom:1px solid #f1f5f9;'}color:#64748b;width:45%;font-size:13px;"><strong>${label}</strong></td>
    <td style="padding:11px 0;${last ? '' : 'border-bottom:1px solid #f1f5f9;'}color:#0f172a;font-weight:600;font-size:13px;">${value || '—'}</td>
  </tr>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SOLICITUD RECIBIDA
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendEmailConfirmation(
  toEmail: string,
  radicado: string,
  patientName: string,
  requestType: string,
  patientData: Record<string, string> = {},
  institution?: EmailInstitution | null
) {
  const primary = institution?.colors?.primary || '#0f766e'
  const detailRows = Object.entries(patientData)
    .filter(([key]) => !['fullName', 'phone', 'email', 'documentType', 'documentNumber', 'privacy_policy'].includes(key) && !key.startsWith('_'))
    .map(([key, value], i, arr) => infoRow(key, value, i === arr.length - 1))
    .join('')

  const body = `
    <p style="margin:0 0 20px 0;font-size:15px;">Hola <strong>${patientName}</strong>,</p>
    <p style="margin:0 0 24px 0;font-size:14px;color:#475569;">Hemos recibido satisfactoriamente su solicitud de <strong style="color:${primary};">${requestType}</strong>.</p>
    <div style="background:linear-gradient(135deg,${primary}15,${primary}08);border:2px solid ${primary}30;border-radius:14px;padding:24px;margin:0 0 24px 0;text-align:center;">
      <p style="margin:0 0 6px 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Número de Radicado</p>
      <p style="margin:0;font-family:monospace;font-size:26px;font-weight:900;color:${primary};letter-spacing:2px;">${radicado}</p>
    </div>
    ${detailRows ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;"><div style="background:#f1f5f9;padding:12px 20px;border-bottom:1px solid #e2e8f0;"><h3 style="margin:0;font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:0.8px;">Detalle de la Solicitud</h3></div><div style="padding:4px 20px;"><table style="width:100%;border-collapse:collapse;">${detailRows}</table></div></div>` : ''}
    <div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;color:#854d0e;font-size:13px;">⚠️ <strong>Importante:</strong> Guarde el número de radicado para consultar el estado de su trámite.</p>
    </div>
    <p style="margin:0;color:#64748b;font-size:13px;">Atentamente,<br/><strong style="color:#1e293b;">${institution?.name || 'Salud360'}</strong></p>
  `
  const html = emailLayout(institution, '✅', 'Solicitud Radicada', 'Su solicitud ha sido recibida exitosamente', body)
  return sendEmail({ to: toEmail, subject: `✅ Solicitud Recibida — Radicado ${radicado}`, html, templateName: 'solicitud_recibida' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ACTUALIZACIÓN DE ESTADO
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendStatusUpdateEmail(
  toEmail: string,
  radicado: string,
  newStatus: string,
  comment?: string,
  attachments?: Array<{ filename: string; content: Buffer }>,
  institution?: EmailInstitution | null
) {
  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    processing: { label: 'En Trámite',  color: '#0284c7', bg: '#eff6ff' },
    responded:  { label: 'Respondida',  color: '#059669', bg: '#f0fdf4' },
    closed:     { label: 'Cerrada',     color: '#64748b', bg: '#f8fafc' },
    escalated:  { label: 'Escalada',    color: '#dc2626', bg: '#fef2f2' },
  }
  const st = statusMap[newStatus] || { label: newStatus, color: '#0f766e', bg: '#f0fdf4' }
  const body = `
    <p style="margin:0 0 20px 0;font-size:15px;">El estado de su radicado <strong>${radicado}</strong> ha sido actualizado.</p>
    <div style="background:${st.bg};border:2px solid ${st.color}30;border-radius:14px;padding:20px;margin:0 0 24px 0;text-align:center;">
      <p style="margin:0 0 6px 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Nuevo Estado</p>
      <span style="display:inline-block;background:${st.color};color:white;border-radius:999px;padding:8px 24px;font-size:16px;font-weight:800;">${st.label}</span>
    </div>
    ${comment ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;"><div style="background:#f1f5f9;padding:12px 20px;border-bottom:1px solid #e2e8f0;"><h3 style="margin:0;font-size:13px;color:#475569;text-transform:uppercase;">Mensaje de la Institución</h3></div><div style="padding:20px;font-size:14px;color:#334155;line-height:1.7;">${comment.replace(/\n/g, '<br/>')}</div></div>` : ''}
    <p style="margin:0;color:#64748b;font-size:13px;">Atentamente,<br/><strong style="color:#1e293b;">${institution?.name || 'Salud360'}</strong></p>
  `
  const html = emailLayout(institution, '🔄', 'Actualización de Solicitud', `Radicado: ${radicado}`, body)
  return sendEmail({ to: toEmail, subject: `🔄 Actualización de Solicitud — ${radicado}`, html, attachments, templateName: 'actualizacion_estado' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. BIENVENIDA ADMINISTRADOR
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendWelcomeAdminEmail(
  toEmail: string,
  tempPassword: string,
  role: string,
  institutionName: string | null,
  loginUrl: string
) {
  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;">Se ha creado una cuenta de administrador para ti en Salud360${institutionName ? ` como parte de <strong>${institutionName}</strong>` : ''}.</p>
    <p style="margin:0 0 20px 0;font-size:14px;">Tu rol asignado: <strong style="color:#0f766e;">${role}</strong></p>
    <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin:0 0 24px 0;">
      <p style="margin:0 0 14px 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Tus Credenciales de Acceso</p>
      <p style="margin:0 0 10px 0;font-size:14px;"><strong>Correo:</strong> ${toEmail}</p>
      <div style="background:#0f172a;border-radius:10px;padding:14px 18px;">
        <p style="margin:0 0 4px 0;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Contraseña Temporal</p>
        <p style="margin:0;color:#34d399;font-family:monospace;font-size:22px;font-weight:900;letter-spacing:3px;">${tempPassword}</p>
      </div>
    </div>
    <div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;color:#854d0e;font-size:13px;">⚠️ <strong>Importante:</strong> Cambia esta contraseña en tu primera sesión.</p>
    </div>
    <a href="${loginUrl}" style="display:inline-block;background:#0f766e;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Ingresar al Panel →</a>
  `
  const html = emailLayout(
    { name: 'Salud360', colors: { primary: '#0f766e', secondary: '#0c4a6e' } },
    '🏥', '¡Bienvenido a Salud360!', 'Panel Administrativo de Gestión Médica', body
  )
  return sendEmail({ to: toEmail, subject: '🏥 Bienvenido a Salud360 — Tus Credenciales de Acceso', html, templateName: 'bienvenida_admin' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CONFIRMACIÓN DE CITA
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendAppointmentConfirmationEmail(
  toEmail: string,
  patientName: string,
  radicado: string,
  appointment: { date: string; time: string; doctor: string; specialty: string; institution: string; branch?: string; branchAddress?: string },
  institution?: EmailInstitution | null
) {
  const primary = institution?.colors?.primary || '#0f766e'
  const dateFormatted = new Date(appointment.date + 'T12:00:00-05:00').toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota'
  })
  const branchRow = appointment.branch
    ? infoRow('📍 Sede', appointment.branchAddress ? `${appointment.branch} — <span style="color:#64748b;">${appointment.branchAddress}</span>` : appointment.branch)
    : ''
  const body = `
    <p style="margin:0 0 20px 0;font-size:15px;">Hola <strong>${patientName}</strong>, su cita ha sido <strong style="color:${primary};">confirmada exitosamente</strong>.</p>
    <div style="background:#f8fafc;border:2px solid ${primary}30;border-radius:14px;overflow:hidden;margin:0 0 24px 0;">
      <div style="background:${primary};padding:12px 20px;"><h3 style="margin:0;font-size:14px;color:white;font-weight:700;">📅 Detalles de su Cita</h3></div>
      <div style="padding:8px 20px;"><table style="width:100%;border-collapse:collapse;">
        ${infoRow('📅 Fecha', `<span style="text-transform:capitalize;">${dateFormatted}</span>`)}
        ${infoRow('🕐 Hora', `<span style="font-size:16px;color:${primary};font-weight:800;">${appointment.time}</span>`)}
        ${infoRow('👨‍⚕️ Doctor', appointment.doctor || 'Por asignar')}
        ${infoRow('🏥 Especialidad', appointment.specialty || '—')}
        ${branchRow}
        ${infoRow('🏢 Institución', appointment.institution, !appointment.branch)}
      </table></div>
    </div>
    <div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#854d0e;font-size:13px;">⚠️ Llegue <strong>15 minutos antes</strong> con su documento de identidad.</p>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:12px;">Radicado: <strong>${radicado}</strong></p>
  `
  const html = emailLayout(institution, '📅', 'Cita Médica Confirmada', dateFormatted, body)
  return sendEmail({ to: toEmail, subject: `📅 Cita Confirmada — ${dateFormatted} a las ${appointment.time}`, html, templateName: 'confirmacion_cita' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. RECORDATORIO DE CITA
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendAppointmentReminderEmail(
  toEmail: string,
  patientName: string,
  radicado: string,
  appointment: { date: string; time: string; doctor: string; specialty: string; institution: string; branch?: string; branchAddress?: string },
  hoursUntil: 24 | 2,
  institution?: EmailInstitution | null
) {
  const isUrgent    = hoursUntil === 2
  const emoji       = isUrgent ? '🚨' : '⏰'
  const timeLabel   = isUrgent ? 'en 2 horas' : 'mañana'
  const accentColor = isUrgent ? '#dc2626' : (institution?.colors?.primary || '#0f766e')
  const dateFormatted = new Date(appointment.date + 'T12:00:00-05:00').toLocaleDateString('es-CO', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Bogota'
  })

  const branchRow = appointment.branch
    ? infoRow('📍 Sede', appointment.branchAddress
        ? `${appointment.branch} — <span style="color:#64748b;">${appointment.branchAddress}</span>`
        : appointment.branch)
    : ''

  const body = `
    <p style="margin:0 0 20px 0;font-size:15px;">Hola <strong>${patientName}</strong>, tiene una cita médica <strong>${timeLabel}</strong>:</p>
    <div style="background:#f8fafc;border:2px solid ${accentColor}40;border-radius:14px;overflow:hidden;margin:0 0 24px 0;">
      <div style="background:${accentColor};padding:12px 20px;"><h3 style="margin:0;font-size:14px;color:white;font-weight:700;">${emoji} Detalles de su Cita</h3></div>
      <div style="padding:8px 20px;"><table style="width:100%;border-collapse:collapse;">
        ${infoRow('📅 Fecha', `<span style="text-transform:capitalize;">${dateFormatted}</span>`)}
        ${infoRow('🕐 Hora', `<span style="font-size:18px;color:${accentColor};font-weight:900;">${appointment.time}</span>`)}
        ${infoRow('👨‍⚕️ Doctor', appointment.doctor || 'Por asignar')}
        ${infoRow('🏥 Especialidad', appointment.specialty || '—')}
        ${branchRow}
        ${infoRow('🏢 Institución', appointment.institution, !appointment.branch)}
      </table></div>
    </div>
    ${isUrgent
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;"><p style="margin:0;color:#991b1b;font-size:13px;">🚨 <strong>Su cita es en 2 horas.</strong> Desplácese ahora con su documento de identidad.</p></div>`
      : `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 18px;"><p style="margin:0;color:#166534;font-size:13px;">✅ Cita mañana. Recuerde llegar <strong>15 minutos antes</strong> con su documento.</p></div>`
    }
    <p style="margin:20px 0 0 0;color:#94a3b8;font-size:12px;">Radicado: <strong>${radicado}</strong></p>
  `
  const reminderInstitution: EmailInstitution = {
    ...(institution || { name: appointment.institution }),
    colors: { primary: accentColor, secondary: isUrgent ? '#b91c1c' : (institution?.colors?.secondary || '#0c4a6e') }
  }
  const html = emailLayout(reminderInstitution, emoji, `Recordatorio de Cita — ${timeLabel}`, dateFormatted, body)
  return sendEmail({ to: toEmail, subject: `${emoji} Recordatorio: Cita médica ${timeLabel} a las ${appointment.time}`, html, templateName: 'recordatorio_cita' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CANCELACIÓN DE CITA
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendPortalCancellationNotification(
  toEmail: string,
  radicado: string,
  patientName: string,
  apptDate: string,
  apptTime: string,
  doctorName: string,
  specialty: string,
  reason: string,
  isForGestor: boolean,
  institution?: EmailInstitution | null
) {
  let subject = '', title = '', subtitle = '', body = ''
  if (isForGestor) {
    subject  = `⚠️ Notificación: Cita Cancelada por Paciente — Radicado ${radicado}`
    title    = '⚠️ Cita Cancelada en Portal Web'
    subtitle = 'Un paciente ha liberado un espacio en la agenda médica'
    body = `
      <p style="margin:0 0 16px 0;font-size:15px;">El paciente <strong>${patientName}</strong> ha cancelado su cita médica desde el portal web.</p>
      <div style="background:#fef2f2;border:2px solid #ef444440;border-radius:14px;padding:20px;margin:0 0 24px 0;">
        <p style="margin:0 0 8px 0;font-size:15px;color:#7f1d1d;"><strong>Fecha y Hora:</strong> ${apptDate} a las ${apptTime}</p>
        <p style="margin:0 0 8px 0;font-size:15px;color:#7f1d1d;"><strong>Médico:</strong> ${doctorName || 'No asignado'} (${specialty || 'General'})</p>
        <p style="margin:0 0 8px 0;font-size:15px;color:#7f1d1d;"><strong>Radicado:</strong> ${radicado}</p>
        <div style="font-size:14px;color:#991b1b;background:#fee2e2;padding:12px 16px;border-radius:8px;margin-top:14px;"><strong>Motivo:</strong><br/>"${reason}"</div>
      </div>
    `
  } else {
    subject  = `🚫 Confirmación de Cancelación de Cita — Radicado ${radicado}`
    title    = '🚫 Cita Cancelada Exitosamente'
    subtitle = 'Confirmación de anulación de cita médica'
    body = `
      <p style="margin:0 0 16px 0;font-size:15px;">Hola <strong>${patientName}</strong>,</p>
      <p style="margin:0 0 20px 0;font-size:14px;color:#475569;">Tu cita médica ha sido cancelada según tu solicitud.</p>
      <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;padding:20px;margin:0 0 24px 0;">
        <p style="margin:0 0 8px 0;font-size:14px;color:#334155;"><strong>Fecha:</strong> ${apptDate} a las ${apptTime}</p>
        <p style="margin:0 0 8px 0;font-size:14px;color:#334155;"><strong>Médico:</strong> ${doctorName || 'No asignado'} (${specialty || 'General'})</p>
        <p style="margin:0;font-size:13px;color:#64748b;"><strong>Motivo:</strong> "${reason}"</p>
      </div>
      <p style="margin:0;color:#64748b;font-size:13px;">Atentamente,<br/><strong style="color:#1e293b;">${institution?.name || 'Salud360'}</strong></p>
    `
  }
  const html = emailLayout(institution, isForGestor ? '⚠️' : '🚫', title, subtitle, body)
  return sendEmail({ to: toEmail, subject, html, templateName: 'cancelacion_cita' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. REPROGRAMACIÓN DE CITA
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendAppointmentRescheduledEmail(
  toEmail: string,
  patientName: string,
  radicado: string,
  oldAppointment: { date: string; time: string; doctor: string; specialty: string },
  newAppointment: { date: string; time: string; doctor: string; specialty: string; institution: string; branch?: string; branchAddress?: string },
  reason: string,
  institution?: EmailInstitution | null
) {
  const primary = institution?.colors?.primary || '#0f766e'
  const fmtDate = (d: string) => {
    try { return new Date(d + 'T12:00:00-05:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota' }) }
    catch { return d }
  }
  const oldDateFormatted = fmtDate(oldAppointment.date)
  const newDateFormatted = fmtDate(newAppointment.date)
  const body = `
    <p style="margin:0 0 20px 0;font-size:15px;">Hola <strong>${patientName}</strong>, su cita ha sido <strong style="color:#d97706;">reprogramada</strong>:</p>
    <table style="width:100%;border-collapse:separate;border-spacing:12px 0;margin-bottom:24px;">
      <tr>
        <td style="width:50%;vertical-align:top;">
          <div style="background:#fef9ec;border:2px solid #fde68a;border-radius:14px;overflow:hidden;">
            <div style="background:#d97706;padding:10px 16px;"><h3 style="margin:0;font-size:13px;color:white;font-weight:700;">📅 Cita Anterior</h3></div>
            <div style="padding:14px 16px;font-size:13px;color:#78350f;">
              <p style="margin:0 0 6px 0;"><strong>Fecha:</strong> <span style="text-transform:capitalize;">${oldDateFormatted}</span></p>
              <p style="margin:0 0 6px 0;"><strong>Hora:</strong> ${oldAppointment.time}</p>
              <p style="margin:0;"><strong>Doctor:</strong> ${oldAppointment.doctor || 'Por asignar'}</p>
            </div>
          </div>
        </td>
        <td style="width:50%;vertical-align:top;">
          <div style="background:#f0fdf4;border:2px solid ${primary}60;border-radius:14px;overflow:hidden;">
            <div style="background:${primary};padding:10px 16px;"><h3 style="margin:0;font-size:13px;color:white;font-weight:700;">✅ Nueva Cita</h3></div>
            <div style="padding:14px 16px;font-size:13px;color:#14532d;">
              <p style="margin:0 0 6px 0;"><strong>Fecha:</strong> <span style="text-transform:capitalize;">${newDateFormatted}</span></p>
              <p style="margin:0 0 6px 0;font-size:15px;font-weight:800;color:${primary};"><strong>Hora:</strong> ${newAppointment.time}</p>
              <p style="margin:0 0 6px 0;"><strong>Doctor:</strong> ${newAppointment.doctor || 'Por asignar'}</p>
              ${newAppointment.branch ? `<p style="margin:0;"><strong>📍 Sede:</strong> ${newAppointment.branch}</p>${newAppointment.branchAddress ? `<p style="margin:0;color:#166534;font-size:12px;">${newAppointment.branchAddress}</p>` : ''}` : ''}
            </div>
          </div>
        </td>
      </tr>
    </table>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#92400e;font-size:13px;"><strong>Motivo:</strong> "${reason}"</p>
    </div>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#166534;font-size:13px;">✅ Recibirá recordatorios 24h y 2h antes de su nueva cita.</p>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:12px;">Radicado: <strong>${radicado}</strong></p>
  `
  const html = emailLayout(institution, '🔄', 'Cita Médica Reprogramada', `Nueva fecha: ${newDateFormatted}`, body)
  return sendEmail({ to: toEmail, subject: `🔄 Cita Reprogramada — Nueva Fecha: ${newDateFormatted} a las ${newAppointment.time}`, html, templateName: 'reprogramacion_cita' })
}

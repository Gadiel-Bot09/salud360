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

// ── Color & Luminance Helpers for High-Contrast Responsive Email Layouts ─────
function isLightColor(hex?: string | null): boolean {
  if (!hex || typeof hex !== 'string') return false
  const clean = hex.replace('#', '').trim()
  if (clean.length !== 6 && clean.length !== 3) return false
  const fullHex = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const r = parseInt(fullHex.substring(0, 2), 16)
  const g = parseInt(fullHex.substring(2, 4), 16)
  const b = parseInt(fullHex.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false
  // Standard perceived luminance formula (ITU-R BT.709 / sRGB)
  return 0.299 * r + 0.587 * g + 0.114 * b > 165
}

function adjustColorBrightness(hex: string, percent: number): string {
  const clean = hex.replace('#', '').trim()
  if (clean.length !== 6 && clean.length !== 3) return hex
  const fullHex = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = parseInt(fullHex, 16)
  if (isNaN(num)) return hex
  let r = (num >> 16) + Math.round(255 * (percent / 100))
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100))
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100))
  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

// ── Shared branded layout builder ─────────────────────────────────────────────
function emailLayout(
  institution: EmailInstitution | null | undefined,
  headerEmoji: string,
  headerTitle: string,
  headerSubtitle: string,
  bodyHtml: string
): string {
  const inst        = institution || { name: 'Salud360' }
  const rawPrimary  = inst.colors?.primary   || '#0f766e'
  const rawSecondary = inst.colors?.secondary || '#0c4a6e'
  const name        = (inst.name || 'Salud360').replace(/\s+/g, ' ').trim()
  const logoUrl     = inst.logo_url

  const secondaryIsLight = isLightColor(rawSecondary)
  const primaryIsLight   = isLightColor(rawPrimary)

  // Gradient computation ensuring AAA / AA contrast for white text in header
  const headerBg1 = primaryIsLight ? '#2d2c2a' : adjustColorBrightness(rawPrimary, -18)
  const headerBg2 = primaryIsLight ? '#444240' : (secondaryIsLight ? rawPrimary : rawSecondary)
  const accentColor = secondaryIsLight ? rawSecondary : '#14b8a6'

  // Crisp framed logo presentation preventing low contrast on any header
  const logoHtml = logoUrl
    ? `<div style="background:#ffffff;padding:7px 14px;border-radius:10px;display:inline-block;box-shadow:0 3px 10px rgba(0,0,0,0.12);border:1px solid rgba(255,255,255,0.4);vertical-align:middle;">
        <img src="${logoUrl}" alt="${name}" style="height:42px;max-width:170px;object-fit:contain;display:block;" />
       </div>`
    : `<div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:white;vertical-align:middle;">${name.charAt(0).toUpperCase()}</div>`

  return `
  <div style="font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;background:#f8fafc;padding:28px 12px;">
    <!-- Main Email Container -->
    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
      
      <!-- Top Decorative Ribbon -->
      <div style="height:4px;background:linear-gradient(90deg, ${accentColor}, #ffffff 50%, ${accentColor});"></div>

      <!-- Header -->
      <div style="background:linear-gradient(135deg, ${headerBg1} 0%, ${headerBg2} 100%);padding:30px 36px 26px 36px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-40px;right:-40px;width:170px;height:170px;border-radius:50%;background:rgba(255,255,255,0.05);pointer-events:none;"></div>
        
        <!-- Branding Bar -->
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
          ${logoHtml}
          <div>
            <div style="font-size:10px;font-weight:800;color:${accentColor};text-transform:uppercase;letter-spacing:1.8px;margin-bottom:3px;">Institución de Salud</div>
            <div style="font-size:16px;font-weight:800;color:#ffffff;line-height:1.2;text-shadow:0 1px 2px rgba(0,0,0,0.25);">${name}</div>
          </div>
        </div>

        <!-- Title Card -->
        <div style="background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.18);border-radius:14px;padding:16px 20px;backdrop-filter:blur(6px);">
          <div style="font-size:20px;font-weight:900;color:#ffffff;margin-bottom:4px;letter-spacing:-0.2px;">${headerEmoji} ${headerTitle}</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.85);font-weight:500;">${headerSubtitle}</div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:34px 36px;background:#ffffff;">
        ${bodyHtml}
      </div>

      <!-- Footer -->
      <div style="background:#fafafa;border-top:1px solid #f1f5f9;padding:18px 36px;text-align:center;">
        <p style="margin:0 0 6px 0;color:#64748b;font-size:12px;font-weight:600;">
          Correo oficial enviado por <strong style="color:#334155;">${name}</strong>
        </p>
        <p style="margin:0;color:#94a3b8;font-size:11px;">
          Plataforma tecnológica administrada por <strong>Salud360</strong> · Sistema de Gestión Médica Digital
          <br/>© ${new Date().getFullYear()} · Todos los derechos reservados.
        </p>
      </div>

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
  const secondary = institution?.colors?.secondary || '#0c4a6e'
  const instName = (institution?.name || 'Salud360').replace(/\s+/g, ' ').trim()

  const detailRows = Object.entries(patientData)
    .filter(([key]) => !['fullName', 'phone', 'email', 'documentType', 'documentNumber', 'privacy_policy'].includes(key) && !key.startsWith('_'))
    .map(([key, value], i, arr) => infoRow(key, value, i === arr.length - 1))
    .join('')

  const body = `
    <p style="margin:0 0 18px 0;font-size:15px;color:#334155;line-height:1.6;">Hola <strong style="color:#0f172a;">${patientName}</strong>,</p>
    <p style="margin:0 0 24px 0;font-size:14px;color:#475569;line-height:1.6;">Hemos recibido satisfactoriamente su solicitud de <strong style="color:${primary};background:#f4f0eb;padding:3px 8px;border-radius:6px;border-left:3px solid ${primary};">${requestType}</strong>.</p>
    <div style="background:linear-gradient(135deg,#fdfbf9 0%,#f7f2ec 100%);border:2px solid ${secondary};border-radius:16px;padding:26px 20px;margin:0 0 28px 0;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.02);">
      <p style="margin:0 0 8px 0;font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:2px;font-weight:800;">Número de Radicado Oficial</p>
      <div style="display:inline-block;background:#ffffff;border:1px solid #e7e0d8;padding:8px 24px;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
        <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:26px;font-weight:900;color:${primary};letter-spacing:2px;">${radicado}</p>
      </div>
      <p style="margin:10px 0 0 0;font-size:12px;color:#a8a29e;">Conserva este número para consultar el estado o realizar seguimiento a tu trámite.</p>
    </div>
    ${detailRows ? `<div style="background:#fcfbf9;border:1px solid #e8e3dc;border-radius:14px;overflow:hidden;margin-bottom:28px;"><div style="background:#f5f0e9;padding:12px 20px;border-bottom:1px solid #e8e3dc;"><h3 style="margin:0;font-size:12px;color:#57534e;text-transform:uppercase;letter-spacing:1px;font-weight:800;">Resumen de la Solicitud</h3></div><div style="padding:10px 20px;"><table style="width:100%;border-collapse:collapse;">${detailRows}</table></div></div>` : ''}
    <div style="background:#fdfcf7;border:1px solid #f0e6c8;border-left:4px solid ${primary};border-radius:10px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;color:#786028;font-size:13px;line-height:1.5;">📌 <strong>Importante:</strong> Guarde el número de radicado para consultar el estado de su trámite en el portal o consultar por WhatsApp.</p>
    </div>
    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Atentamente,<br/><strong style="color:#1e293b;font-size:14px;">${instName}</strong></p>
  `
  const html = emailLayout(institution, '✅', 'Solicitud Radicada Exitosamente', 'Su solicitud ha sido recibida y se encuentra en gestión', body)
  return sendEmail({ to: toEmail, subject: `✅ Solicitud Recibida — Radicado ${radicado}`, html, templateName: 'solicitud_recibida' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ACTUALIZACIÓN DE ESTADO Y RESPUESTAS
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendStatusUpdateEmail(
  toEmail: string,
  radicado: string,
  newStatus: string,
  comment?: string,
  attachments?: Array<{ filename: string; content: Buffer }>,
  institution?: EmailInstitution | null
) {
  const primary = institution?.colors?.primary || '#0f766e'
  const secondary = institution?.colors?.secondary || '#0c4a6e'
  const instName = (institution?.name || 'Salud360').replace(/\s+/g, ' ').trim()

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    processing: { label: 'En Trámite',  color: '#0284c7', bg: '#eff6ff' },
    responded:  { label: 'Respondida',  color: '#059669', bg: '#f0fdf4' },
    closed:     { label: 'Cerrada',     color: '#64748b', bg: '#f8fafc' },
    escalated:  { label: 'Escalada',    color: '#dc2626', bg: '#fef2f2' },
  }
  const st = statusMap[newStatus] || { label: newStatus, color: primary, bg: '#f8fafc' }
  const body = `
    <p style="margin:0 0 18px 0;font-size:15px;color:#334155;line-height:1.6;">Estimado(a) paciente, le informamos que el estado de su radicado <strong style="color:#0f172a;">${radicado}</strong> ha sido actualizado.</p>
    <div style="background:${st.bg};border:2px solid ${st.color}40;border-radius:16px;padding:20px;margin:0 0 28px 0;text-align:center;">
      <p style="margin:0 0 6px 0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;">Nuevo Estado</p>
      <span style="display:inline-block;background:${st.color};color:white;border-radius:999px;padding:8px 26px;font-size:15px;font-weight:800;letter-spacing:0.3px;">${st.label}</span>
    </div>
    ${comment ? `
    <div style="background:#fcfbf9;border:1px solid #e8e3dc;border-left:4px solid ${primary};border-radius:14px;overflow:hidden;margin-bottom:28px;box-shadow:0 2px 8px rgba(0,0,0,0.02);">
      <div style="background:#f5f0e9;padding:14px 20px;border-bottom:1px solid #e8e3dc;display:flex;align-items:center;justify-content:space-between;">
        <h3 style="margin:0;font-size:12px;color:#57534e;text-transform:uppercase;letter-spacing:1px;font-weight:800;">Respuesta Oficial de la Institución</h3>
        <span style="font-size:11px;color:#8c827a;font-weight:600;">${instName}</span>
      </div>
      <div style="padding:22px 20px;font-size:14px;color:#292524;line-height:1.75;background:#ffffff;">
        ${comment.replace(/\n/g, '<br/>')}
      </div>
    </div>` : ''}
    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Atentamente,<br/><strong style="color:#1e293b;font-size:14px;">${instName}</strong></p>
  `
  const html = emailLayout(institution, '💬', 'Respuesta a su Solicitud', `Radicado: ${radicado}`, body)
  return sendEmail({ to: toEmail, subject: `💬 Respuesta a su Solicitud — ${radicado}`, html, attachments, templateName: 'actualizacion_estado' })
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
  const secondary = institution?.colors?.secondary || '#0c4a6e'
  const instName = (institution?.name || appointment.institution || 'Salud360').replace(/\s+/g, ' ').trim()

  const dateFormatted = new Date(appointment.date + 'T12:00:00-05:00').toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota'
  })
  const branchRow = appointment.branch
    ? infoRow('📍 Sede', appointment.branchAddress ? `${appointment.branch} — <span style="color:#64748b;">${appointment.branchAddress}</span>` : appointment.branch)
    : ''
  const body = `
    <p style="margin:0 0 18px 0;font-size:15px;color:#334155;line-height:1.6;">Hola <strong style="color:#0f172a;">${patientName}</strong>, nos complace informarle que su cita médica ha sido <strong style="color:${primary};">confirmada exitosamente</strong>.</p>
    <div style="background:#ffffff;border:2px solid ${secondary};border-radius:16px;overflow:hidden;margin:0 0 28px 0;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
      <div style="background:${primary};padding:14px 22px;border-bottom:3px solid ${secondary};display:flex;align-items:center;justify-content:space-between;">
        <h3 style="margin:0;font-size:14px;color:#ffffff;font-weight:800;letter-spacing:0.5px;">📅 Detalles de su Cita Médica</h3>
        <span style="background:rgba(255,255,255,0.2);color:#ffffff;font-size:11px;padding:3px 10px;border-radius:999px;font-weight:700;">Confirmada</span>
      </div>
      <div style="padding:16px 22px;background:#fcfbf9;">
        <table style="width:100%;border-collapse:collapse;">
          ${infoRow('📅 Fecha', `<span style="text-transform:capitalize;font-weight:700;">${dateFormatted}</span>`)}
          ${infoRow('🕐 Hora', `<span style="background:#f4f0eb;padding:3px 10px;border-radius:6px;border:1px solid #e7dfd5;color:${primary};font-weight:900;font-size:16px;">${appointment.time}</span>`)}
          ${infoRow('👨‍⚕️ Doctor / Especialista', appointment.doctor || 'Por asignar')}
          ${infoRow('🏥 Especialidad', appointment.specialty || '—')}
          ${branchRow}
          ${infoRow('🏢 Institución', instName, !appointment.branch)}
        </table>
      </div>
    </div>
    <div style="background:#fefce8;border:1px solid #fde047;border-radius:12px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;color:#854d0e;font-size:13px;line-height:1.5;">⚠️ <strong>Recomendación:</strong> Por favor llegue <strong>15 minutos antes</strong> con su documento de identidad y soportes médicos.</p>
    </div>
    <p style="margin:0 0 4px 0;color:#94a3b8;font-size:12px;">Radicado asociado: <strong>${radicado}</strong></p>
    <p style="margin:16px 0 0 0;color:#64748b;font-size:13px;line-height:1.6;">Atentamente,<br/><strong style="color:#1e293b;font-size:14px;">${instName}</strong></p>
  `
  const html = emailLayout(institution, '📅', 'Cita Médica Confirmada', `${dateFormatted} a las ${appointment.time}`, body)
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
  const secondary   = institution?.colors?.secondary || '#0c4a6e'
  const instName    = (institution?.name || appointment.institution || 'Salud360').replace(/\s+/g, ' ').trim()
  const dateFormatted = new Date(appointment.date + 'T12:00:00-05:00').toLocaleDateString('es-CO', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Bogota'
  })

  const branchRow = appointment.branch
    ? infoRow('📍 Sede', appointment.branchAddress
        ? `${appointment.branch} — <span style="color:#64748b;">${appointment.branchAddress}</span>`
        : appointment.branch)
    : ''

  const body = `
    <p style="margin:0 0 18px 0;font-size:15px;color:#334155;line-height:1.6;">Hola <strong style="color:#0f172a;">${patientName}</strong>, le recordamos que tiene una cita médica programada <strong>${timeLabel}</strong>:</p>
    <div style="background:#ffffff;border:2px solid ${secondary};border-radius:16px;overflow:hidden;margin:0 0 24px 0;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
      <div style="background:${accentColor};padding:14px 22px;border-bottom:3px solid ${secondary};"><h3 style="margin:0;font-size:14px;color:white;font-weight:800;">${emoji} Recordatorio de su Cita</h3></div>
      <div style="padding:16px 22px;background:#fcfbf9;"><table style="width:100%;border-collapse:collapse;">
        ${infoRow('📅 Fecha', `<span style="text-transform:capitalize;font-weight:700;">${dateFormatted}</span>`)}
        ${infoRow('🕐 Hora', `<span style="background:#f4f0eb;padding:3px 10px;border-radius:6px;border:1px solid #e7dfd5;color:${accentColor};font-weight:900;font-size:16px;">${appointment.time}</span>`)}
        ${infoRow('👨‍⚕️ Doctor / Especialista', appointment.doctor || 'Por asignar')}
        ${infoRow('🏥 Especialidad', appointment.specialty || '—')}
        ${branchRow}
        ${infoRow('🏢 Institución', instName, !appointment.branch)}
      </table></div>
    </div>
    ${isUrgent
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:20px;"><p style="margin:0;color:#991b1b;font-size:13px;">🚨 <strong>Su cita es en 2 horas.</strong> Por favor desplácese con su documento de identidad y soportes.</p></div>`
      : `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 18px;margin-bottom:20px;"><p style="margin:0;color:#166534;font-size:13px;">✅ Cita programada para mañana. Recuerde presentarse <strong>15 minutos antes</strong> con su documento.</p></div>`
    }
    <p style="margin:0 0 4px 0;color:#94a3b8;font-size:12px;">Radicado: <strong>${radicado}</strong></p>
    <p style="margin:16px 0 0 0;color:#64748b;font-size:13px;line-height:1.6;">Atentamente,<br/><strong style="color:#1e293b;font-size:14px;">${instName}</strong></p>
  `
  const reminderInstitution: EmailInstitution = {
    ...(institution || { name: appointment.institution }),
    colors: { primary: accentColor, secondary: isUrgent ? '#b91c1c' : secondary }
  }
  const html = emailLayout(reminderInstitution, emoji, `Recordatorio de Cita — ${timeLabel}`, `${dateFormatted} a las ${appointment.time}`, body)
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
  const instName = (institution?.name || 'Salud360').replace(/\s+/g, ' ').trim()
  let subject = '', title = '', subtitle = '', body = ''
  if (isForGestor) {
    subject  = `⚠️ Notificación: Cita Cancelada por Paciente — Radicado ${radicado}`
    title    = '⚠️ Cita Cancelada en Portal Web'
    subtitle = 'Un paciente ha liberado un espacio en la agenda médica'
    body = `
      <p style="margin:0 0 16px 0;font-size:15px;color:#334155;">El paciente <strong>${patientName}</strong> ha cancelado su cita médica desde el portal de pacientes.</p>
      <div style="background:#fef2f2;border:2px solid #ef444440;border-radius:14px;padding:20px;margin:0 0 24px 0;">
        <p style="margin:0 0 8px 0;font-size:14px;color:#7f1d1d;"><strong>Fecha y Hora:</strong> ${apptDate} a las ${apptTime}</p>
        <p style="margin:0 0 8px 0;font-size:14px;color:#7f1d1d;"><strong>Especialista:</strong> ${doctorName || 'No asignado'} (${specialty || 'General'})</p>
        <p style="margin:0 0 8px 0;font-size:14px;color:#7f1d1d;"><strong>Radicado:</strong> ${radicado}</p>
        <div style="font-size:13px;color:#991b1b;background:#fee2e2;padding:12px 16px;border-radius:8px;margin-top:14px;"><strong>Motivo informado:</strong><br/>"${reason}"</div>
      </div>
    `
  } else {
    subject  = `🚫 Confirmación de Cancelación de Cita — Radicado ${radicado}`
    title    = '🚫 Cita Cancelada Exitosamente'
    subtitle = 'Confirmación de anulación de cita médica'
    body = `
      <p style="margin:0 0 16px 0;font-size:15px;color:#334155;">Hola <strong>${patientName}</strong>,</p>
      <p style="margin:0 0 20px 0;font-size:14px;color:#475569;">Le confirmamos que su cita médica ha sido cancelada conforme a su solicitud.</p>
      <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;padding:20px;margin:0 0 24px 0;">
        <p style="margin:0 0 8px 0;font-size:14px;color:#334155;"><strong>Fecha:</strong> ${apptDate} a las ${apptTime}</p>
        <p style="margin:0 0 8px 0;font-size:14px;color:#334155;"><strong>Especialista:</strong> ${doctorName || 'No asignado'} (${specialty || 'General'})</p>
        <p style="margin:0;font-size:13px;color:#64748b;"><strong>Motivo:</strong> "${reason}"</p>
      </div>
      <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Atentamente,<br/><strong style="color:#1e293b;font-size:14px;">${instName}</strong></p>
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
  const primary   = institution?.colors?.primary || '#0f766e'
  const secondary = institution?.colors?.secondary || '#0c4a6e'
  const instName  = (institution?.name || newAppointment.institution || 'Salud360').replace(/\s+/g, ' ').trim()

  const fmtDate = (d: string) => {
    try { return new Date(d + 'T12:00:00-05:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota' }) }
    catch { return d }
  }
  const oldDateFormatted = fmtDate(oldAppointment.date)
  const newDateFormatted = fmtDate(newAppointment.date)
  const body = `
    <p style="margin:0 0 18px 0;font-size:15px;color:#334155;line-height:1.6;">Hola <strong style="color:#0f172a;">${patientName}</strong>, su cita médica ha sido <strong style="color:#d97706;">reprogramada</strong>:</p>
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
          <div style="background:#ffffff;border:2px solid ${secondary};border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="background:${primary};padding:10px 16px;border-bottom:2px solid ${secondary};"><h3 style="margin:0;font-size:13px;color:white;font-weight:700;">✅ Nueva Cita</h3></div>
            <div style="padding:14px 16px;font-size:13px;color:#1c1917;background:#fcfbf9;">
              <p style="margin:0 0 6px 0;"><strong>Fecha:</strong> <span style="text-transform:capitalize;font-weight:700;">${newDateFormatted}</span></p>
              <p style="margin:0 0 6px 0;font-size:15px;font-weight:800;color:${primary};"><strong>Hora:</strong> ${newAppointment.time}</p>
              <p style="margin:0 0 6px 0;"><strong>Doctor:</strong> ${newAppointment.doctor || 'Por asignar'}</p>
              ${newAppointment.branch ? `<p style="margin:0;"><strong>📍 Sede:</strong> ${newAppointment.branch}</p>${newAppointment.branchAddress ? `<p style="margin:0;color:#64748b;font-size:12px;">${newAppointment.branchAddress}</p>` : ''}` : ''}
            </div>
          </div>
        </td>
      </tr>
    </table>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#92400e;font-size:13px;"><strong>Motivo de reprogramación:</strong> "${reason}"</p>
    </div>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#166534;font-size:13px;">✅ Recibirá recordatorios automáticos 24h y 2h antes de su nueva cita.</p>
    </div>
    <p style="margin:0 0 4px 0;color:#94a3b8;font-size:12px;">Radicado: <strong>${radicado}</strong></p>
    <p style="margin:16px 0 0 0;color:#64748b;font-size:13px;line-height:1.6;">Atentamente,<br/><strong style="color:#1e293b;font-size:14px;">${instName}</strong></p>
  `
  const html = emailLayout(institution, '🔄', 'Cita Médica Reprogramada', `Nueva fecha: ${newDateFormatted}`, body)
  return sendEmail({ to: toEmail, subject: `🔄 Cita Reprogramada — Nueva Fecha: ${newDateFormatted} a las ${newAppointment.time}`, html, templateName: 'reprogramacion_cita' })
}

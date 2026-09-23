import { getInstitutionBySlug, getInstitutionTemplate } from '@/app/actions'
import { RequestForm } from '@/components/patient/request-form'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Search, MapPin, Phone, Globe, Mail, Shield, Stethoscope, Wrench } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { canal?: string }
}) {
  const institution = await getInstitutionBySlug(params.slug)
  const esPresencial = searchParams?.canal === 'presencial'

  if (!institution) {
    return notFound()
  }

  const primary   = institution.colors?.primary   || '#0f766e'
  const secondary = institution.colors?.secondary || '#134e4a'
  const initial   = institution.name?.charAt(0)?.toUpperCase() || 'I'

  // ── MAINTENANCE MODE ────────────────────────────────────────────────────────
  if ((institution as any).portal_maintenance) {
    const msg = (institution as any).maintenance_message ||
      'Estamos realizando mejoras para brindarte una mejor experiencia. Por favor intenta más tarde.'
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ background: 'rgba(255,255,255,0.4)' }} />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-10" style={{ background: 'rgba(255,255,255,0.3)' }} />
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-10 max-w-lg w-full text-center shadow-2xl">
          {/* Logo / Initial */}
          <div className="mb-6 flex justify-center">
            {institution.logo_url ? (
              <img src={institution.logo_url} alt={institution.name} className="h-16 w-auto object-contain drop-shadow-lg" />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg"
                style={{ background: 'rgba(255,255,255,0.25)' }}
              >
                {initial}
              </div>
            )}
          </div>

          {/* Wrench icon */}
          <div className="flex justify-center mb-5">
            <div className="bg-white/20 rounded-full p-4">
              <Wrench className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2">Portal en Mantenimiento</h1>
          <p className="text-white/60 text-sm font-medium mb-4 uppercase tracking-widest">{institution.name}</p>

          {/* Message */}
          <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 mb-6">
            <p className="text-white/90 text-sm leading-relaxed">{msg}</p>
          </div>

          {/* Contact */}
          {institution.contact_email && (
            <p className="text-white/70 text-xs">
              ¿Necesitas ayuda?{' '}
              <a href={`mailto:${institution.contact_email}`} className="text-white font-semibold underline underline-offset-2">
                {institution.contact_email}
              </a>
            </p>
          )}
          {institution.phone && (
            <p className="text-white/70 text-xs mt-1">
              📞 {institution.phone}
            </p>
          )}
        </div>

        <p className="relative z-10 mt-6 text-white/40 text-xs">Salud360 · Sistema de Gestión Médica Digital</p>
      </div>
    )
  }
  // ── END MAINTENANCE MODE ────────────────────────────────────────────────────

  const template = await getInstitutionTemplate(institution.id)

  return (
    <div
      className="min-h-screen"
      style={{
        '--brand-primary': primary,
        '--brand-secondary': secondary,
      } as React.CSSProperties}
    >
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'rgba(255,255,255,0.4)' }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'rgba(255,255,255,0.3)' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
            style={{ background: 'rgba(255,255,255,0.6)' }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-5">
            {institution.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={institution.logo_url}
                alt={institution.name}
                className="h-20 w-auto object-contain rounded-2xl shadow-2xl"
                style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.25))' }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shadow-2xl"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(8px)',
                  border: '2px solid rgba(255,255,255,0.35)',
                  color: 'white',
                }}
              >
                {initial}
              </div>
            )}
          </div>

          {/* Institution name */}
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-sm">
            {institution.name}
          </h1>

          {/* Tagline */}
          {institution.tagline && (
            <p className="mt-2 text-lg font-medium text-white/80 max-w-lg">
              {institution.tagline}
            </p>
          )}

          {/* Description */}
          {institution.description && (
            <p className="mt-3 text-sm text-white/65 max-w-xl leading-relaxed">
              {institution.description}
            </p>
          )}

          {/* Contact chips */}
          {(institution.address || institution.phone || institution.contact_email || institution.website) && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {institution.address && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(4px)' }}>
                  <MapPin className="h-3 w-3" />
                  {institution.address}
                </span>
              )}
              {institution.phone && (
                <a href={`tel:${institution.phone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-white/25 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(4px)' }}>
                  <Phone className="h-3 w-3" />
                  {institution.phone}
                </a>
              )}
              {institution.contact_email && (
                <a href={`mailto:${institution.contact_email}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-white/25 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(4px)' }}>
                  <Mail className="h-3 w-3" />
                  {institution.contact_email}
                </a>
              )}
              {institution.website && (
                <a href={institution.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-white/25 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(4px)' }}>
                  <Globe className="h-3 w-3" />
                  Sitio Web
                </a>
              )}
            </div>
          )}

          {/* CTA — consult radicado */}
          <div className="mt-7">
            <Link
              href={`/portal/${params.slug}/consulta`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'rgba(255,255,255,0.95)',
                color: primary,
              }}
            >
              <Search className="w-4 h-4" />
              Consultar Estado o Cancelar mi Cita
            </Link>
          </div>
        </div>

        {/* Wave separator */}
        <div className="relative h-8 overflow-hidden">
          <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f8fafc" />
          </svg>
        </div>
      </div>

      {/* ── Form Area ─────────────────────────────────────────────────────────── */}
      <main className="bg-slate-50 px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-3xl mx-auto">
          {/* Section heading */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: `${primary}18`, color: primary }}>
              <Shield className="h-3.5 w-3.5" />
              Portal Seguro
            </div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* ── Banner modo presencial ─────────────────────────────────── */}
          {esPresencial && (
            <div className="flex items-start gap-3 bg-orange-50 border-2 border-orange-300 rounded-2xl px-5 py-4 mb-6 shadow-sm">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Stethoscope className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-black text-orange-800 text-sm uppercase tracking-wide">🏥 Modo Atención Presencial</p>
                <p className="text-orange-700 text-xs mt-1 leading-snug">
                  Estás registrando una solicitud en nombre de un paciente que se encuentra <strong>físicamente en la institución</strong>.
                  Esta solicitud quedará marcada como <strong>Presencial</strong> en el sistema para estadísticas.
                </p>
              </div>
            </div>
          )}

          {/* Form card */}
          <div
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
            style={{ borderTop: `4px solid ${esPresencial ? '#ea580c' : primary}` }}
          >
            <div className="px-6 sm:px-10 py-8">
              <RequestForm
                institutionId={institution.id}
                institutionName={institution.name}
                institutionLogoUrl={institution.logo_url || undefined}
                institutionSlug={params.slug}
                template={template}
                brandColors={{ primary, secondary }}
                canal={esPresencial ? 'presencial' : 'online'}
              />
            </div>
          </div>

          {/* Footer trust signal */}
          <p className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3" />
            Portal administrado por Salud360 — Plataforma certificada de gestión médica digital
          </p>
        </div>
      </main>
    </div>
  )
}

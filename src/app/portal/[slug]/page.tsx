import { getInstitutionBySlug, getInstitutionTemplate } from '@/app/actions'
import { RequestForm } from '@/components/patient/request-form'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Search, MapPin, Phone, Globe, Mail, Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PortalPage({ params }: { params: { slug: string } }) {
  const institution = await getInstitutionBySlug(params.slug)

  if (!institution) {
    return notFound()
  }

  const template = await getInstitutionTemplate(institution.id)

  const primary = institution.colors?.primary || '#0f766e'
  const secondary = institution.colors?.secondary || '#134e4a'
  const initial = institution.name?.charAt(0)?.toUpperCase() || 'I'

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
              href="/consulta"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'rgba(255,255,255,0.95)',
                color: primary,
              }}
            >
              <Search className="w-4 h-4" />
              Consultar Estado de mi Radicado
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

          {/* Form card */}
          <div
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
            style={{ borderTop: `4px solid ${primary}` }}
          >
            <div className="px-6 sm:px-10 py-8">
              <RequestForm
                institutionId={institution.id}
                institutionName={institution.name}
                institutionLogoUrl={institution.logo_url || undefined}
                template={template}
                brandColors={{ primary, secondary }}
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

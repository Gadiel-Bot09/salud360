import { getInstitutionBySlug } from '@/app/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Phone, Globe, Mail, Shield, ArrowLeft, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PrivacyPolicyPage({ params }: { params: { slug: string } }) {
  const institution = await getInstitutionBySlug(params.slug)

  if (!institution) {
    return notFound()
  }

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
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'rgba(255,255,255,0.4)' }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {institution.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={institution.logo_url}
                alt={institution.name}
                className="h-12 w-auto object-contain rounded-xl shadow-lg"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow-lg"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  color: 'white',
                }}
              >
                {initial}
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-sm">
                Política de Tratamiento de Datos
              </h1>
              <p className="text-sm font-medium text-white/80">{institution.name}</p>
            </div>
          </div>
          
          <Link
            href={`/portal/${params.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all hover:bg-white/20"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al portal
          </Link>
        </div>

        {/* Wave separator */}
        <div className="relative h-8 overflow-hidden">
          <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f8fafc" />
          </svg>
        </div>
      </div>

      {/* ── Document Area ─────────────────────────────────────────────────────────── */}
      <main className="bg-slate-50 px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Document card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <FileText className="h-5 w-5" style={{ color: primary }} />
                <h2 className="font-semibold text-slate-800">Términos y Condiciones Legales</h2>
            </div>
            <div className="p-6 sm:p-10 prose prose-slate max-w-none text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {institution.privacy_policy ? (
                  institution.privacy_policy
              ) : (
                  <div className="text-center py-12">
                      <p className="text-slate-400 italic">
                          Esta institución aún no ha publicado una política de tratamiento de datos personalizada.
                      </p>
                  </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Link
                href={`/portal/${params.slug}`}
                className="inline-flex items-center justify-center gap-2 py-3 px-8 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                style={{ background: primary }}
            >
                Entendido, regresar al formulario
            </Link>
          </div>

          {/* Footer trust signal */}
          <p className="mt-10 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-1.5 opacity-60">
            <Shield className="h-3 w-3" />
            Documento de carácter legal — Plataforma Salud360
          </p>
        </div>
      </main>
    </div>
  )
}

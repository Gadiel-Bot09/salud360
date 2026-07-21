import { getInstitutionBySlug } from '@/app/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Shield, ArrowLeft, FileText, Calendar, Lock, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

// ── Simple Markdown renderer (no external deps) ────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={key++} className="text-base font-bold text-slate-800 mt-6 mb-2 flex items-center gap-2">
          <span className="inline-block w-1.5 h-4 rounded-full bg-teal-500 shrink-0" />
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={key++} className="text-lg font-bold text-slate-900 mt-8 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('# ')) {
      nodes.push(
        <h1 key={key++} className="text-xl font-black text-slate-900 mt-2 mb-4">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      nodes.push(
        <li key={key++} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed py-0.5">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
          {line.slice(2)}
        </li>
      )
    } else if (line.trim() === '') {
      nodes.push(<div key={key++} className="h-2" />)
    } else {
      // Inline bold (**text**)
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      nodes.push(
        <p key={key++} className="text-sm text-slate-600 leading-relaxed">
          {parts.map((part, pi) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={pi} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>
              : part
          )}
        </p>
      )
    }
  }
  return nodes
}

export default async function PrivacyPolicyPage({ params }: { params: { slug: string } }) {
  const institution = await getInstitutionBySlug(params.slug)

  if (!institution) return notFound()

  const primary   = institution.colors?.primary   || '#0f766e'
  const secondary = institution.colors?.secondary || '#134e4a'
  const initial   = institution.name?.charAt(0)?.toUpperCase() || 'I'
  const today     = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.08]" style={{ background: 'white' }} />
          <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full opacity-[0.06]" style={{ background: 'white' }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-8 py-8">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            {/* Logo + name */}
            <div className="flex items-center gap-4">
              {institution.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={institution.logo_url}
                  alt={institution.name}
                  className="h-14 w-auto object-contain rounded-2xl shadow-xl"
                  style={{ background: 'rgba(255,255,255,0.15)', padding: '6px', backdropFilter: 'blur(8px)' }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl"
                  style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}
                >
                  {initial}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-0.5">Institución de Salud</p>
                <p className="text-xl font-bold text-white leading-tight">{institution.name}</p>
              </div>
            </div>

            <Link
              href={`/portal/${params.slug}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al portal
            </Link>
          </div>

          {/* Title card */}
          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Política de Tratamiento<br className="hidden sm:block" /> de Datos Personales
                </h1>
              </div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-xl">
              En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Colombia), esta institución garantiza la protección de su información personal.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Calendar className="w-3 h-3" /> Vigente: {today}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Shield className="w-3 h-3" /> Ley 1581 de 2012
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <FileText className="w-3 h-3" /> Decreto 1377 de 2013
              </span>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="relative h-10 overflow-hidden">
          <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f8fafc" />
          </svg>
        </div>
      </div>

      {/* ── Content Area ─────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 pb-20">
        {/* Legal alert */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8">
          <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Documento de carácter legal</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Al usar el portal de {institution.name} usted acepta los términos aquí descritos. Le recomendamos leer este documento completo.
            </p>
          </div>
        </div>

        {/* Document body */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Card header */}
          <div className="flex items-center gap-3 px-6 sm:px-10 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="p-2 rounded-xl" style={{ background: `${primary}18` }}>
              <FileText className="w-5 h-5" style={{ color: primary }} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Texto de la Política</h2>
              <p className="text-xs text-slate-400">{institution.name}</p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 sm:px-10 py-8">
            {institution.privacy_policy ? (
              <div className="space-y-1">
                {renderMarkdown(institution.privacy_policy)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${primary}12` }}>
                  <FileText className="w-8 h-8" style={{ color: primary }} />
                </div>
                <p className="font-semibold text-slate-600 mb-1">Política no configurada</p>
                <p className="text-sm text-slate-400 max-w-sm">
                  Esta institución aún no ha publicado su política de tratamiento de datos. Comuníquese directamente con la institución.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={`/portal/${params.slug}`}
            className="inline-flex items-center justify-center gap-2 py-3 px-8 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Entendido, regresar al formulario
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-1.5">
          <Shield className="h-3 w-3" />
          Documento legal — {institution.name} · Plataforma Salud360
        </p>
      </main>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePassword, updateInstitutionBranding } from './actions'
import {
  Settings, KeyRound, Building2, Link2, CheckCircle2,
  AlertCircle, Loader2, Palette, Globe, MapPin, Phone,
  Mail, FileText, Eye, Sparkles,
} from 'lucide-react'

interface Institution {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
  tagline: string | null
  description: string | null
  address: string | null
  phone: string | null
  contact_email: string | null
  website: string | null
  colors: { primary: string; secondary: string } | null
}

interface Props {
  userEmail: string
  userRole: string
  institution: Institution | null
  siteUrl: string
}

function Alert({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${type === 'success' ? 'bg-teal-50 border border-teal-200 text-teal-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
      {type === 'success'
        ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
        : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
      {msg}
    </div>
  )
}

// ── Password Section ──────────────────────────────────────────────────────────
function PasswordSection() {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await changePassword(fd)
      setFeedback({ type: res.success ? 'success' : 'error', msg: res.success ? res.message! : res.error! })
      if (res.success) (e.target as HTMLFormElement).reset()
    })
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <KeyRound className="h-5 w-5 text-teal-600" />
        <div>
          <h3 className="font-semibold text-slate-800">Seguridad de Acceso</h3>
          <p className="text-xs text-slate-500">Cambia tu contraseña de ingreso al panel.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-md">
        {feedback && <Alert type={feedback.type} msg={feedback.msg} />}
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nueva Contraseña</Label>
          <Input id="newPassword" name="newPassword" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} placeholder="Repite la contraseña" />
        </div>
        <Button type="submit" disabled={pending} className="bg-teal-600 hover:bg-teal-700 w-full">
          {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Actualizando...</> : 'Actualizar Contraseña'}
        </Button>
      </form>
    </section>
  )
}

// ── Portal Preview Mini ───────────────────────────────────────────────────────
function PortalPreview({
  name, tagline, logoUrl, primaryColor, secondaryColor,
}: {
  name: string; tagline: string; logoUrl: string; primaryColor: string; secondaryColor: string
}) {
  const initial = name?.charAt(0)?.toUpperCase() || 'I'
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 px-3 pt-2 pb-1 bg-slate-50 flex items-center gap-1">
        <Eye className="h-3 w-3" /> Vista previa del portal
      </p>
      <div
        className="px-6 py-5 flex flex-col items-center text-white text-center"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor || primaryColor}cc 100%)` }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={name} className="h-12 object-contain mb-3 rounded-lg shadow-md" />
        ) : (
          <div className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center text-xl font-bold shadow-md"
            style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)' }}>
            {initial}
          </div>
        )}
        <p className="font-bold text-sm">{name || 'Nombre Institución'}</p>
        {tagline && <p className="text-white/75 text-xs mt-0.5">{tagline}</p>}
      </div>
    </div>
  )
}

// ── Institution Branding Section ──────────────────────────────────────────────
function BrandingSection({ institution, siteUrl }: { institution: Institution; siteUrl: string }) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [slug, setSlug] = useState(institution.slug || '')
  const [name, setName] = useState(institution.name || '')
  const [tagline, setTagline] = useState(institution.tagline || '')
  const [logoUrl, setLogoUrl] = useState(institution.logo_url || '')
  const [primaryColor, setPrimaryColor] = useState(institution.colors?.primary || '#0f766e')
  const [secondaryColor, setSecondaryColor] = useState(institution.colors?.secondary || '#134e4a')
  const portalUrl = `${siteUrl}/portal/${slug || '...'}`

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.append('institutionId', institution.id)
    // Override color values with live state (bidirectional sync)
    fd.set('primaryColor', primaryColor)
    fd.set('secondaryColor', secondaryColor)
    startTransition(async () => {
      const res = await updateInstitutionBranding(fd)
      setFeedback({ type: res.success ? 'success' : 'error', msg: res.success ? res.message! : res.error! })
    })
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <Building2 className="h-5 w-5 text-teal-600" />
        <div>
          <h3 className="font-semibold text-slate-800">Configuración Institucional</h3>
          <p className="text-xs text-slate-500">Personaliza la identidad y el portal público de tu clínica.</p>
        </div>
      </div>

      {/* Portal URL Preview */}
      <div className="mx-6 mt-6 flex items-center gap-3 bg-slate-900 rounded-xl px-5 py-4">
        <Globe className="h-5 w-5 text-teal-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">URL del Portal Pacientes (Marca Blanca)</p>
          <p className="text-teal-300 font-mono text-sm truncate">{portalUrl}</p>
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(portalUrl)}
          className="ml-auto shrink-0 flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          title="Copiar URL"
        >
          <Link2 className="h-4 w-4" /> Copiar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {feedback && <Alert type={feedback.type} msg={feedback.msg} />}

        {/* ── Identidad Visual ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">
            <Palette className="h-4 w-4 text-teal-600" /> Identidad Visual
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="name">Razón Social</Label>
                <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Identificador URL <span className="text-xs text-slate-400">(letras y guiones)</span>
                </Label>
                <Input
                  id="slug" name="slug"
                  value={slug} onChange={(e) => setSlug(e.target.value)}
                  placeholder="ej: clinica-sanitas" required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Eslogan / Tagline</Label>
                <Input
                  id="tagline" name="tagline"
                  value={tagline} onChange={(e) => setTagline(e.target.value)}
                  placeholder="ej: Tu salud, nuestra misión"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL del Logo</Label>
                <Input
                  id="logo_url" name="logo_url" type="url"
                  value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..." 
                />
              </div>

              {/* Color Primary */}
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Color Primario</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color" id="primaryColor" name="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#0f766e"
                    className="font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>

              {/* Color Secondary */}
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Color Secundario</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color" id="secondaryColor" name="secondaryColor"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-14 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#134e4a"
                    className="font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="flex flex-col gap-3">
              <PortalPreview
                name={name}
                tagline={tagline}
                logoUrl={logoUrl}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
              />
              <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" /> Vista previa en tiempo real
              </p>
            </div>
          </div>
        </div>

        {/* ── Información de Contacto ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">
            <FileText className="h-4 w-4 text-teal-600" /> Información de Contacto del Portal
          </div>
          <p className="text-xs text-slate-500">Esta información aparecerá visible en el portal público del paciente.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-400" /> Descripción breve de la institución
              </Label>
              <textarea
                id="description" name="description"
                defaultValue={institution.description || ''}
                rows={3} placeholder="Ej: Somos una IPS dedicada a la atención integral de salud familiar..."
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Dirección
              </Label>
              <Input id="address" name="address" defaultValue={institution.address || ''} placeholder="Calle 123 # 45-67, Ciudad" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" /> Teléfono / Línea de Atención
              </Label>
              <Input id="phone" name="phone" defaultValue={institution.phone || ''} placeholder="601 123 4567 / 01 8000 ..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> Correo de Contacto
              </Label>
              <Input id="contact_email" name="contact_email" type="email" defaultValue={institution.contact_email || ''} placeholder="atencion@clinica.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-400" /> Sitio Web
              </Label>
              <Input id="website" name="website" type="url" defaultValue={institution.website || ''} placeholder="https://www.clinica.com" />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={pending} className="bg-teal-600 hover:bg-teal-700 px-8">
          {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : 'Guardar Configuración'}
        </Button>
      </form>
    </section>
  )
}

// ── Main Page Client Component ────────────────────────────────────────────────
export function SettingsClient({ userEmail, userRole, institution, siteUrl }: Props) {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Settings className="w-8 h-8 text-teal-600" />
          Configuración
        </h2>
        <p className="text-slate-500 mt-1">Administra tu perfil, seguridad e identidad institucional.</p>
      </div>

      {/* Account Info Card */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {userEmail.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{userEmail}</p>
          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${userRole === 'Super Admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}`}>
            {userRole}
          </span>
        </div>
      </section>

      {/* Password Change */}
      <PasswordSection />

      {/* Institution Branding — only if assigned to one */}
      {institution ? (
        <BrandingSection institution={institution} siteUrl={siteUrl} />
      ) : (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <Building2 className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700">Sin Institución Asignada</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
            Tu perfil de Super Admin opera a nivel global. Para configurar una institución específica, ve al módulo de Instituciones.
          </p>
        </section>
      )}
    </div>
  )
}

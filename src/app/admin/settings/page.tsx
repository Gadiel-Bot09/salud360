import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './settings-client'
import { headers } from 'next/headers'
import { getResponseTemplates, createResponseTemplate, updateResponseTemplate, deleteResponseTemplate } from './template-actions'
import { TemplatesManager } from '@/components/admin/templates-manager'
import { Settings, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: userProfile } = await supabase
    .from('users')
    .select('role, institution_id')
    .eq('id', user?.id ?? '')
    .single()

  // Fetch institution if the user has one assigned
  let institution = null
  if (userProfile?.institution_id) {
    const { data } = await supabase
      .from('institutions')
      .select('id, name, slug, logo_url, colors, tagline, description, address, phone, contact_email, website')
      .eq('id', userProfile.institution_id)
      .single()
    institution = data
  }

  const headersList = await headers()
  const host = headersList.get('host') || 'salud360.sinuhub.com'
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const siteUrl = `${proto}://${host}`

  const templates = await getResponseTemplates()

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-600" /> Configuración
        </h1>
        <p className="text-slate-500 text-sm mt-1">Administre su institución, acceso y plantillas de respuesta.</p>
      </div>

      {/* Section: General Settings */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4" /> Configuración General
        </h2>
        <SettingsClient
          userEmail={user?.email ?? ''}
          userRole={userProfile?.role ?? 'Gestor'}
          institution={institution}
          siteUrl={siteUrl}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Section: Response Templates */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Plantillas de Respuesta
        </h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <TemplatesManager
            templates={templates}
            onCreate={createResponseTemplate}
            onUpdate={updateResponseTemplate}
            onDelete={deleteResponseTemplate}
          />
        </div>
      </div>
    </div>
  )
}

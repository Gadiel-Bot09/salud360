import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { SettingsClient } from './settings-client'
import { headers } from 'next/headers'
import { getResponseTemplates, createResponseTemplate, updateResponseTemplate, deleteResponseTemplate } from './template-actions'
import { TemplatesManager } from '@/components/admin/templates-manager'
import { BranchesManager } from '@/components/admin/branches-manager'
import { getBranches } from '@/app/admin/requests/branches-actions'
import { Settings, FileText, Building2, Mail, CheckCircle2, XCircle, BarChart3 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: userProfile } = await supabase
    .from('users')
    .select('role_id, institution_id, roles(name)')
    .eq('id', user?.id ?? '')
    .single()

  // Fetch institution using admin client to bypass RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let institution = null
  if (userProfile?.institution_id) {
    const { data } = await supabaseAdmin
      .from('institutions')
      .select('id, name, slug, logo_url, colors, tagline, description, address, phone, contact_email, website, privacy_policy, evolution_connected, evolution_instance_name, codigo_prestador')
      .eq('id', userProfile.institution_id)
      .single()
    institution = data
  }

  // ── Check REAL Evolution state at server render time ──────────────────────
  // This ensures the page loads with the correct status without client-side guess
  let initialEvolutionConnected = institution?.evolution_connected ?? false
  if (institution?.evolution_instance_name && !initialEvolutionConnected) {
    try {
      const EVO_URL = process.env.EVOLUTION_API_URL
      const EVO_KEY = process.env.EVOLUTION_API_KEY
      if (EVO_URL && EVO_KEY) {
        const evoRes = await fetch(
          `${EVO_URL}/instance/connectionState/${institution.evolution_instance_name}`,
          { method: 'GET', headers: { apikey: EVO_KEY } }
        )
        if (evoRes.ok) {
          const evoData = await evoRes.json()
          const state   = (evoData?.instance?.state ?? evoData?.state ?? '').toLowerCase()
          if (state === 'open') {
            initialEvolutionConnected = true
            // Sync Supabase so subsequent loads are fast
            await supabaseAdmin
              .from('institutions')
              .update({ evolution_connected: true })
              .eq('id', institution.id)
          }
        }
      }
    } catch { /* silent — client will retry */ }
  }

  const headersList = await headers()
  const host = headersList.get('host') || 'salud360.sinuhub.com'
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const siteUrl = `${proto}://${host}`

  const templates = await getResponseTemplates()
  const branches  = await getBranches()

  // ── Email stats from email_logs table ──────────────────────────────────────
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: emailStats } = await supabaseAdmin
    .from('email_logs')
    .select('status, template_name')
    .gte('sent_at', todayStart.toISOString())

  const totalToday  = emailStats?.length ?? 0
  const sentToday   = emailStats?.filter(e => e.status === 'sent').length ?? 0
  const errorsToday = emailStats?.filter(e => e.status === 'error').length ?? 0
  const dailyLimit  = 300
  const usagePercent = Math.round((totalToday / dailyLimit) * 100)

  // Count by template type
  const templateCounts: Record<string, number> = {}
  emailStats?.forEach(e => {
    if (e.status === 'sent') {
      templateCounts[e.template_name] = (templateCounts[e.template_name] ?? 0) + 1
    }
  })

  const templateLabels: Record<string, string> = {
    solicitud_recibida:  'Solicitud recibida',
    actualizacion_estado: 'Actualización de estado',
    confirmacion_cita:   'Confirmación de cita',
    recordatorio_cita:   'Recordatorio de cita',
    cancelacion_cita:    'Cancelación de cita',
    reprogramacion_cita: 'Reprogramación de cita',
    bienvenida_admin:    'Bienvenida administrador',
    generic:             'Genérico',
  }

  // Bar color based on usage
  const barColor = usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-teal-500'
  const textColor = usagePercent >= 90 ? 'text-red-600' : usagePercent >= 70 ? 'text-amber-600' : 'text-teal-600'

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
          userRole={(userProfile as any)?.roles?.name ?? 'Gestor'}
          institution={institution}
          siteUrl={siteUrl}
          initialEvolutionConnected={initialEvolutionConnected}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Section: Sedes / Sucursales */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Sedes / Sucursales
        </h2>
        <p className="text-xs text-slate-400 mb-4">Registra las sedes o sucursales de tu institución para indicarlas en la asignación de citas.</p>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <BranchesManager initialBranches={branches} />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Section: Email Monitor */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
          <Mail className="w-4 h-4" /> Monitor de Correos — Brevo
        </h2>
        <p className="text-xs text-slate-400 mb-4">Consumo de correos electrónicos del día de hoy frente al límite diario del plan gratuito de Brevo (300/día).</p>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">

          {/* Top stats row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Total hoy */}
            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
              <p className="text-3xl font-black text-slate-800">{totalToday}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Enviados hoy</p>
            </div>
            {/* Exitosos */}
            <div className="bg-teal-50 rounded-xl p-4 text-center border border-teal-100">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <p className="text-3xl font-black text-teal-700">{sentToday}</p>
              </div>
              <p className="text-xs text-teal-600 font-medium">Exitosos</p>
            </div>
            {/* Errores */}
            <div className={`rounded-xl p-4 text-center border ${errorsToday > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <XCircle className={`w-4 h-4 ${errorsToday > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                <p className={`text-3xl font-black ${errorsToday > 0 ? 'text-red-600' : 'text-slate-400'}`}>{errorsToday}</p>
              </div>
              <p className={`text-xs font-medium ${errorsToday > 0 ? 'text-red-500' : 'text-slate-400'}`}>Con error</p>
            </div>
          </div>

          {/* Usage bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-slate-700">Uso del límite diario</p>
              <p className={`text-sm font-bold ${textColor}`}>{totalToday} / {dailyLimit} ({usagePercent}%)</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            {usagePercent >= 90 && (
              <p className="text-xs text-red-600 font-semibold">⚠️ Atención: estás cerca del límite diario de Brevo. Considera actualizar al plan de pago.</p>
            )}
            {usagePercent >= 70 && usagePercent < 90 && (
              <p className="text-xs text-amber-600 font-semibold">⚡ Más del 70% del límite diario consumido.</p>
            )}
          </div>

          {/* Breakdown by type */}
          {Object.keys(templateCounts).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Desglose por tipo</p>
              </div>
              <div className="space-y-2">
                {Object.entries(templateCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, count]) => {
                    const pct = Math.round((count / sentToday) * 100)
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <p className="text-xs text-slate-600 w-44 shrink-0">{templateLabels[key] ?? key}</p>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="h-2 rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs font-bold text-slate-700 w-8 text-right">{count}</p>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {totalToday === 0 && (
            <div className="text-center py-4 text-slate-400">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No se han enviado correos hoy todavía.</p>
            </div>
          )}
        </div>
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

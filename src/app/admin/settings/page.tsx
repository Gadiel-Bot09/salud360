import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { SettingsClient } from './settings-client'
import { headers } from 'next/headers'
import { getResponseTemplates, createResponseTemplate, updateResponseTemplate, deleteResponseTemplate } from './template-actions'
import { getAllInstitutionsMaintenance, togglePortalMaintenance, setAllInstitutionsMaintenance } from './actions'
import { TemplatesManager } from '@/components/admin/templates-manager'
import { BranchesManager } from '@/components/admin/branches-manager'
import { MaintenanceModeSection } from '@/components/admin/maintenance-mode-section'
import { getBranches } from '@/app/admin/requests/branches-actions'
import { Settings, FileText, Building2, Mail, CheckCircle2, XCircle, BarChart3, Wrench } from 'lucide-react'

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

  // ── Maintenance data ────────────────────────────────────────────────────────
  const roleName  = (userProfile as any)?.roles?.name ?? ''
  const isSuper   = roleName === 'Super Admin'
  // Super Admin: get all institutions. Regular admin: just their own institution
  const allInstitutionsMaintenance = isSuper ? await getAllInstitutionsMaintenance() : []

  // ── Email stats from email_logs table — Brevo Starter: 5,000/month ──────────
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Monthly stats
  const { data: monthStats } = await supabaseAdmin
    .from('email_logs')
    .select('status, template_name, sent_at')
    .gte('sent_at', monthStart.toISOString())

  // Today stats (subset)
  const { data: todayStats } = await supabaseAdmin
    .from('email_logs')
    .select('status')
    .gte('sent_at', todayStart.toISOString())

  const monthlyLimit   = 5000
  const totalMonth     = monthStats?.length ?? 0
  const sentMonth      = monthStats?.filter(e => e.status === 'sent').length ?? 0
  const errorsMonth    = monthStats?.filter(e => e.status === 'error').length ?? 0
  const totalToday     = todayStats?.length ?? 0
  const remaining      = Math.max(0, monthlyLimit - totalMonth)
  const usagePercent   = Math.round((totalMonth / monthlyLimit) * 100)

  // Month name in Spanish
  const monthName = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  // Count by template type (monthly, sent only)
  const templateCounts: Record<string, number> = {}
  monthStats?.forEach(e => {
    if (e.status === 'sent') {
      templateCounts[e.template_name] = (templateCounts[e.template_name] ?? 0) + 1
    }
  })

  const templateLabels: Record<string, string> = {
    solicitud_recibida:   'Solicitud recibida',
    actualizacion_estado: 'Actualización de estado',
    confirmacion_cita:    'Confirmación de cita',
    recordatorio_cita:    'Recordatorio de cita',
    cancelacion_cita:     'Cancelación de cita',
    reprogramacion_cita:  'Reprogramación de cita',
    bienvenida_admin:     'Bienvenida administrador',
    generic:              'Genérico',
  }

  // Bar color based on usage
  const barColor  = usagePercent >= 90 ? 'bg-red-500'    : usagePercent >= 70 ? 'bg-amber-500' : 'bg-teal-500'
  const textColor = usagePercent >= 90 ? 'text-red-600'  : usagePercent >= 70 ? 'text-amber-600' : 'text-teal-600'


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
          <Mail className="w-4 h-4" /> Monitor de Correos — Brevo Starter
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Consumo mensual de correos — Plan Starter Brevo · <span className="capitalize font-medium text-slate-500">{monthName}</span> · Límite: 5,000 correos/mes.
        </p>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">

          {/* Top stats row */}
          <div className="grid grid-cols-4 gap-4">
            {/* Enviados este mes */}
            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
              <p className="text-3xl font-black text-slate-800">{sentMonth}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Enviados este mes</p>
            </div>
            {/* Hoy */}
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
              <p className="text-3xl font-black text-blue-700">{totalToday}</p>
              <p className="text-xs text-blue-600 mt-1 font-medium">Enviados hoy</p>
            </div>
            {/* Exitosos */}
            <div className="bg-teal-50 rounded-xl p-4 text-center border border-teal-100">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <p className="text-3xl font-black text-teal-700">{sentMonth}</p>
              </div>
              <p className="text-xs text-teal-600 font-medium">Exitosos mes</p>
            </div>
            {/* Errores */}
            <div className={`rounded-xl p-4 text-center border ${errorsMonth > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <XCircle className={`w-4 h-4 ${errorsMonth > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                <p className={`text-3xl font-black ${errorsMonth > 0 ? 'text-red-600' : 'text-slate-400'}`}>{errorsMonth}</p>
              </div>
              <p className={`text-xs font-medium ${errorsMonth > 0 ? 'text-red-500' : 'text-slate-400'}`}>Con error</p>
            </div>
          </div>

          {/* Monthly usage bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-slate-700">Uso del límite mensual</p>
              <p className={`text-sm font-bold ${textColor}`}>{totalMonth.toLocaleString()} / {monthlyLimit.toLocaleString()} ({usagePercent}%)</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-400">{remaining.toLocaleString()} correos restantes este mes</p>
              <p className="text-xs text-slate-400">Renovación el 10 de cada mes</p>
            </div>
            {usagePercent >= 90 && (
              <p className="text-xs text-red-600 font-semibold">⚠️ Atención: estás cerca del límite mensual de Brevo. Considera subir al siguiente plan.</p>
            )}
            {usagePercent >= 70 && usagePercent < 90 && (
              <p className="text-xs text-amber-600 font-semibold">⚡ Más del 70% del límite mensual consumido.</p>
            )}
          </div>

          {/* Breakdown by type */}
          {Object.keys(templateCounts).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Desglose por tipo — este mes</p>
              </div>
              <div className="space-y-2">
                {Object.entries(templateCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, count]) => {
                    const pct = sentMonth > 0 ? Math.round((count / sentMonth) * 100) : 0
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

          {totalMonth === 0 && (
            <div className="text-center py-4 text-slate-400">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No se han enviado correos este mes todavía.</p>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Section: Maintenance Mode — client component with feedback */}
      <MaintenanceModeSection
        isSuper={isSuper}
        institution={institution ? {
          id: institution.id,
          name: institution.name,
          portal_maintenance: (institution as any).portal_maintenance ?? false,
          maintenance_message: (institution as any).maintenance_message ?? null,
        } : null}
        allInstitutions={allInstitutionsMaintenance.map((i: any) => ({
          id: i.id,
          name: i.name,
          slug: i.slug,
          portal_maintenance: i.portal_maintenance ?? false,
          maintenance_message: i.maintenance_message ?? null,
        }))}
      />

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

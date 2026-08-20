import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { WhatsAppManagerClient } from './whatsapp-manager-client'
import { Smartphone } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function WhatsAppManagerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar permiso whatsapp.manage
  const { data: userProfile } = await supabase
    .from('users')
    .select('role_id, institution_id, roles(name, permissions)')
    .eq('id', user.id)
    .single()

  const profile     = userProfile as any
  const roleName    = profile?.roles?.name || ''
  const permissions = (profile?.roles?.permissions as string[]) || []
  const isSuperAdmin = roleName === 'Super Admin'
  const hasPermission = isSuperAdmin || permissions.includes('*') || permissions.includes('whatsapp.manage')

  if (!hasPermission) {
    redirect('/admin/dashboard')
  }

  if (!profile?.institution_id) {
    redirect('/admin/dashboard')
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: institution } = await supabaseAdmin
    .from('institutions')
    .select('id, name, evolution_connected, evolution_instance_name')
    .eq('id', profile.institution_id)
    .single()

  // Verificar estado real en Evolution API al cargar
  let initialConnected = institution?.evolution_connected ?? false
  if (institution?.evolution_instance_name && !initialConnected) {
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
          const state = (evoData?.instance?.state ?? evoData?.state ?? '').toLowerCase()
          if (state === 'open') {
            initialConnected = true
            await supabaseAdmin
              .from('institutions')
              .update({ evolution_connected: true })
              .eq('id', institution!.id)
          }
        }
      }
    } catch { /* silent */ }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-green-600" />
          Conexión WhatsApp
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestiona la conexión de WhatsApp de <span className="font-semibold text-slate-700">{institution?.name}</span> para el envío de recordatorios automáticos.
        </p>
      </div>

      <WhatsAppManagerClient
        institution={institution as any}
        initialConnected={initialConnected}
        userRole={roleName}
      />
    </div>
  )
}

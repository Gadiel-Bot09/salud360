import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { institutionId, instanceName } = await request.json()
    if (!institutionId || !instanceName) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const EVO_URL = process.env.EVOLUTION_API_URL
    const EVO_KEY = process.env.EVOLUTION_API_KEY

    if (!EVO_URL || !EVO_KEY) {
      return NextResponse.json({ error: 'Evolution API no configurada' }, { status: 500 })
    }

    const response = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { apikey: EVO_KEY }
    })

    if (!response.ok) {
      console.error('Evolution API returned', response.status)
      return NextResponse.json({ connected: false, state: 'error' })
    }

    const data        = await response.json()
    const state       = (data?.instance?.state ?? data?.state ?? 'unknown').toLowerCase()
    const isConnected = state === 'open'

    // Extract phone number from ownerJid if available
    const ownerJid    = data?.instance?.owner ?? data?.instance?.ownerJid ?? null
    const phoneNumber = ownerJid ? ownerJid.split('@')[0] : null

    // Sync to Supabase using ADMIN client (bypasses RLS)
    const { error: dbErr } = await supabaseAdmin
      .from('institutions')
      .update({ evolution_connected: isConnected })
      .eq('id', institutionId)

    if (dbErr) console.error('Status DB sync error:', dbErr)

    return NextResponse.json({ connected: isConnected, state, phoneNumber })
  } catch (error: any) {
    console.error('Status instance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

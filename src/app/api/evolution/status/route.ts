import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { institutionId, instanceName } = await request.json()
    if (!institutionId || !instanceName) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

    const URL = process.env.EVOLUTION_API_URL
    const KEY = process.env.EVOLUTION_API_KEY

    if (!URL || !KEY) return NextResponse.json({ error: 'Evolution API no configurada' }, { status: 500 })

    // ── Query real connection state from Evolution API ────────────────────────
    const response = await fetch(`${URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { apikey: KEY }
    })

    if (!response.ok) {
      console.error('Evolution API returned', response.status, await response.text())
      return NextResponse.json({ connected: false, state: 'error' })
    }

    const data = await response.json()

    // Evolution API returns state='open' when connected
    // It may also return state='close', 'connecting', 'qr', etc.
    const state       = data?.instance?.state ?? data?.state ?? 'unknown'
    const isConnected = state === 'open'

    // ── Extract phone number if available ─────────────────────────────────────
    // Evolution returns the phone in instance.profilePictureUrl or ownerJid
    const ownerJid   = data?.instance?.owner ?? data?.instance?.ownerJid ?? null
    const phoneNumber = ownerJid ? ownerJid.split('@')[0] : null

    // ── Sync state to Supabase (bidirectional) ────────────────────────────────
    await supabase
      .from('institutions')
      .update({ evolution_connected: isConnected })
      .eq('id', institutionId)

    return NextResponse.json({
      connected:   isConnected,
      state,
      phoneNumber, // e.g. "573128287913"
    })
  } catch (error: any) {
    console.error('Status instance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

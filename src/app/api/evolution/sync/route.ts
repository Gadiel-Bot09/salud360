import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/evolution/sync
 *
 * Queries Evolution API for the REAL connection state of an instance
 * and force-syncs it into Supabase institutions.evolution_connected.
 * Returns the raw Evolution response for debugging purposes.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { institutionId, instanceName } = await request.json()
    if (!institutionId || !instanceName) {
      return NextResponse.json({ error: 'Faltan parámetros: institutionId e instanceName son requeridos' }, { status: 400 })
    }

    const EVO_URL = process.env.EVOLUTION_API_URL
    const EVO_KEY = process.env.EVOLUTION_API_KEY

    if (!EVO_URL || !EVO_KEY) {
      return NextResponse.json({ error: 'Variables de entorno EVOLUTION_API_URL / EVOLUTION_API_KEY no configuradas' }, { status: 500 })
    }

    // ── 1. Query connectionState ──────────────────────────────────────────────
    const stateRes  = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { apikey: EVO_KEY },
    })
    const stateRaw  = await stateRes.text()
    let   stateData: any = {}
    try { stateData = JSON.parse(stateRaw) } catch { /* not JSON */ }

    // Evolution can return different shapes depending on version:
    // v1: { instance: { state: "open" } }
    // v2: { state: "open" }
    // v2 alt: { instance: { instanceName: "...", state: "open" } }
    const state = (
      stateData?.instance?.state ??
      stateData?.state ??
      stateData?.status ??
      ''
    ).toLowerCase()

    const isConnected = state === 'open'

    // ── 2. If not explicitly 'open', also try fetchInstances list ─────────────
    // Some Evolution versions mark it differently in list vs connectionState
    let confirmedConnected = isConnected
    if (!isConnected && instanceName) {
      try {
        const listRes  = await fetch(`${EVO_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: 'GET',
          headers: { apikey: EVO_KEY },
        })
        const listData = await listRes.json()
        // fetchInstances returns an array
        const inst = Array.isArray(listData)
          ? listData.find((i: any) => i.instance?.instanceName === instanceName || i.name === instanceName)
          : listData
        const listState = (inst?.instance?.state ?? inst?.state ?? '').toLowerCase()
        if (listState === 'open') confirmedConnected = true
      } catch { /* ignore */ }
    }

    // ── 3. Sync Supabase ──────────────────────────────────────────────────────
    const { error: dbErr } = await supabase
      .from('institutions')
      .update({
        evolution_connected:    confirmedConnected,
        evolution_instance_name: instanceName,   // ensure it's stored
      })
      .eq('id', institutionId)

    if (dbErr) console.error('Supabase sync error:', dbErr)

    return NextResponse.json({
      connected:   confirmedConnected,
      state,
      rawResponse: stateData,  // full response for debugging
      synced:      !dbErr,
    })
  } catch (error: any) {
    console.error('Evolution sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

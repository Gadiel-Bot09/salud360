import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/evolution/test-send
 *
 * Diagnostic endpoint: tests WhatsApp sending and returns full debug info.
 * Shows exactly what's failing and why.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { institutionId, testPhone } = await request.json()
    if (!institutionId) return NextResponse.json({ error: 'Falta institutionId' }, { status: 400 })

    const EVO_URL = process.env.EVOLUTION_API_URL
    const EVO_KEY = process.env.EVOLUTION_API_KEY
    const debug: Record<string, any> = {}

    // ── Step 1: Check env vars ────────────────────────────────────────────────
    debug.env = {
      EVOLUTION_API_URL: EVO_URL ? `✅ ${EVO_URL}` : '❌ NOT SET',
      EVOLUTION_API_KEY: EVO_KEY ? `✅ ${EVO_KEY.substring(0, 6)}...` : '❌ NOT SET',
    }

    if (!EVO_URL || !EVO_KEY) {
      return NextResponse.json({ ok: false, step: 'env_vars', debug })
    }

    // ── Step 2: Read institution from Supabase ────────────────────────────────
    const { data: inst, error: instErr } = await supabase
      .from('institutions')
      .select('id, name, evolution_instance_name, evolution_connected')
      .eq('id', institutionId)
      .single()

    debug.institution = inst
      ? { name: inst.name, instance: inst.evolution_instance_name, connected_flag: inst.evolution_connected }
      : { error: instErr?.message }

    if (!inst?.evolution_instance_name) {
      return NextResponse.json({ ok: false, step: 'no_instance_name', debug })
    }

    const instanceName = inst.evolution_instance_name

    // ── Step 3: connectionState raw response ──────────────────────────────────
    let connectionRaw: any = null
    let connectionStatus  = 0
    try {
      const res = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: { apikey: EVO_KEY },
      })
      connectionStatus = res.status
      connectionRaw    = await res.json()
    } catch (e: any) {
      connectionRaw = { fetchError: e.message }
    }

    const state = (
      connectionRaw?.instance?.state ??
      connectionRaw?.state ??
      connectionRaw?.status ??
      ''
    ).toLowerCase()

    debug.connectionState = {
      httpStatus: connectionStatus,
      rawResponse: connectionRaw,
      parsedState: state,
      isOpen: state === 'open',
    }

    // ── Step 4: fetchInstances fallback ───────────────────────────────────────
    let fetchInstancesRaw: any = null
    try {
      const res2 = await fetch(`${EVO_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: 'GET',
        headers: { apikey: EVO_KEY },
      })
      fetchInstancesRaw = await res2.json()
    } catch (e: any) {
      fetchInstancesRaw = { fetchError: e.message }
    }
    debug.fetchInstances = fetchInstancesRaw

    // ── Step 5: Try test send if phone provided ───────────────────────────────
    if (testPhone) {
      let phone = String(testPhone).replace(/\D/g, '')
      if (phone.length === 10 && phone.startsWith('3')) phone = '57' + phone

      debug.testSend = { targetNumber: phone }

      try {
        const sendRes = await fetch(`${EVO_URL}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: EVO_KEY },
          body: JSON.stringify({
            number: phone,
            text: `🔧 Mensaje de prueba de Salud360 — ${new Date().toLocaleString('es-CO')}`
          })
        })
        const sendData = await sendRes.json()
        debug.testSend.httpStatus  = sendRes.status
        debug.testSend.response    = sendData
        debug.testSend.ok          = sendRes.ok
      } catch (e: any) {
        debug.testSend.fetchError = e.message
      }
    }

    return NextResponse.json({ ok: true, debug })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

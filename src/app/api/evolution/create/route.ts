import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { institutionId } = await request.json()
    if (!institutionId) return NextResponse.json({ error: 'Falta institutionId' }, { status: 400 })

    const instanceName = `salud360-${institutionId}`
    const EVO_URL = process.env.EVOLUTION_API_URL
    const EVO_KEY = process.env.EVOLUTION_API_KEY

    // ── Helper: check real state from Evolution ───────────────────────────────
    const getRealState = async (): Promise<string> => {
      try {
        const res  = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: { apikey: EVO_KEY! }
        })
        const data = await res.json()
        return (data?.instance?.state ?? data?.state ?? '').toLowerCase()
      } catch { return '' }
    }

    // ── Attempt to create the instance ───────────────────────────────────────
    const response = await fetch(`${EVO_URL}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVO_KEY! },
      body: JSON.stringify({
        instanceName,
        token: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    })

    const data = await response.json()
    const alreadyExists = !response.ok && (
      JSON.stringify(data).toLowerCase().includes('already') ||
      JSON.stringify(data).toLowerCase().includes('in use') ||
      JSON.stringify(data).toLowerCase().includes('already exists')
    )

    if (alreadyExists) {
      // ── Instance exists — check if it's already connected ─────────────────
      const realState = await getRealState()

      if (realState === 'open') {
        // Already connected! Just sync Supabase and return connected
        await supabase.from('institutions')
          .update({ evolution_instance_name: instanceName, evolution_connected: true })
          .eq('id', institutionId)
        return NextResponse.json({ success: true, alreadyConnected: true, instanceName })
      }

      // Not connected — request a new QR for re-linking
      const connectRes  = await fetch(`${EVO_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { apikey: EVO_KEY! }
      })
      const connectData = await connectRes.json()

      if (connectData.base64) {
        await supabase.from('institutions')
          .update({ evolution_instance_name: instanceName, evolution_connected: false })
          .eq('id', institutionId)
        return NextResponse.json({ success: true, base64: connectData.base64, instanceName })
      }

      // Could not get QR — tell the client the state
      return NextResponse.json({
        error: `La instancia existe pero no está conectada (estado: ${realState || 'desconocido'}). Ve a Evolution API y verifica la instancia.`
      }, { status: 409 })
    }

    if (!response.ok) {
      throw new Error(data?.message || data?.response?.message || 'Error al crear instancia')
    }

    // ── Newly created instance ────────────────────────────────────────────────
    await supabase.from('institutions')
      .update({ evolution_instance_name: instanceName, evolution_connected: false })
      .eq('id', institutionId)

    return NextResponse.json({ success: true, base64: data.qrcode?.base64, instanceName })
  } catch (error: any) {
    console.error('Create instance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


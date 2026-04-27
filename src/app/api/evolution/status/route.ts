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

    const response = await fetch(`${URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { apikey: KEY! }
    })

    const data = await response.json()
    const isConnected = data?.instance?.state === 'open'

    if (isConnected) {
      // Marcar en BD como conectado
      await supabase.from('institutions').update({ evolution_connected: true }).eq('id', institutionId)
    }

    return NextResponse.json({ connected: isConnected, state: data?.instance?.state })
  } catch (error: any) {
    console.error('Status instance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

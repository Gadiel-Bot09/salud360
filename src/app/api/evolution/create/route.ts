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
    const URL = process.env.EVOLUTION_API_URL
    const KEY = process.env.EVOLUTION_API_KEY

    // Llamar a Evolution API
    const response = await fetch(`${URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: KEY!
      },
      body: JSON.stringify({
        instanceName,
        token: instanceName,
        qrcode: true
      })
    })

    const data = await response.json()

    if (!response.ok) {
      if (data?.response?.message?.includes('already exists') || data?.message?.includes('already exists')) {
        // La instancia existe, intentar conectar para pedir el QR
        const connectRes = await fetch(`${URL}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: { apikey: KEY! }
        })
        const connectData = await connectRes.json()
        if (connectData.base64) {
          await supabase.from('institutions').update({ evolution_instance_name: instanceName, evolution_connected: false }).eq('id', institutionId)
          return NextResponse.json({ success: true, base64: connectData.base64, instanceName })
        }
      }
      throw new Error(data?.message || data?.response?.message || 'Error al crear instancia')
    }

    // Actualizar BD
    await supabase.from('institutions').update({ evolution_instance_name: instanceName, evolution_connected: false }).eq('id', institutionId)

    return NextResponse.json({ success: true, base64: data.qrcode?.base64, instanceName })
  } catch (error: any) {
    console.error('Create instance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

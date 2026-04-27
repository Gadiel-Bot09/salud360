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

    // Logout and Delete
    await fetch(`${URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { apikey: KEY! }
    })
    
    await fetch(`${URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { apikey: KEY! }
    })

    // Actualizar BD
    await supabase.from('institutions').update({ evolution_instance_name: null, evolution_connected: false }).eq('id', institutionId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Logout instance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

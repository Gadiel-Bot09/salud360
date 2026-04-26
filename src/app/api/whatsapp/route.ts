import { NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/evolution'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { number, text, instanceName = 'default' } = body

    if (!number || !text) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (number, text)' },
        { status: 400 }
      )
    }

    const result = await sendWhatsAppMessage(instanceName, { number, text })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error procesando solicitud de WhatsApp' },
      { status: 500 }
    )
  }
}

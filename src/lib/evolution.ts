const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

interface WhatsAppMessagePayload {
  number: string
  text: string
}

export const sendWhatsAppMessage = async (
  instanceName: string,
  payload: WhatsAppMessagePayload
) => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error('Faltan credenciales de Evolution API')
    return null
  }

  if (!instanceName) {
    console.error('sendWhatsAppMessage: instanceName vacío')
    return null
  }

  // Sanitize phone number: must be digits only, add country code 57 if missing
  let number = payload.number.replace(/\D/g, '')
  if (!number) {
    console.error('sendWhatsAppMessage: número de teléfono inválido', payload.number)
    return null
  }
  // If local Colombian number (10 digits starting with 3), prepend country code
  if (number.length === 10 && number.startsWith('3')) {
    number = '57' + number
  }

  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number,
          text: payload.text,
        }),
      }
    )

    if (!response.ok) {
      const body = await response.text()
      console.error(`Evolution API error ${response.status}:`, body)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error enviando mensaje por WhatsApp:', error)
    return null
  }
}

// ── Check real connection state directly from Evolution ───────────────────────
export const checkEvolutionConnection = async (instanceName: string): Promise<boolean> => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !instanceName) return false
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { apikey: EVOLUTION_API_KEY },
    })
    if (!res.ok) return false
    const data = await res.json()
    const state = data?.instance?.state ?? data?.state ?? ''
    return state === 'open'
  } catch {
    return false
  }
}

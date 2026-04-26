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
          number: payload.number,
          text: payload.text,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Error Evolution API: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error enviando mensaje por WhatsApp:', error)
    return null
  }
}

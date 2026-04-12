'use server'

import { createClient } from '@supabase/supabase-js'

export type TrackResult = {
  success: boolean;
  message?: string;
  data?: any;
  multipleResults?: any[];
}

export async function trackRequest(prevState: any, formData: FormData): Promise<TrackResult> {
  const radicado       = (formData.get('radicado') as string || '').trim().toUpperCase()
  const documentNumber = (formData.get('documentNumber') as string || '').trim()

  if (!radicado && !documentNumber) {
    return { success: false, message: 'Ingrese al menos el número de radicado o su número de documento.' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const BASE_SELECT = `
    id, radicado, type, status, created_at, patient_data_json,
    request_history ( id, action, created_at, comment )
  `

  // ── Mode 1: Both fields — exact single match ─────────────────────────────
  if (radicado && documentNumber) {
    const { data: request, error } = await supabase
      .from('requests')
      .select(BASE_SELECT)
      .eq('radicado', radicado)
      .eq('patient_document_number', documentNumber)
      .single()

    if (error || !request) {
      return { success: false, message: 'No se encontró ninguna solicitud con ese radicado y número de documento. Verifique los datos.' }
    }

    return { success: true, data: withSortedHistory(request) }
  }

  // ── Mode 2: Only radicado ────────────────────────────────────────────────
  if (radicado) {
    const { data: request, error } = await supabase
      .from('requests')
      .select(BASE_SELECT)
      .eq('radicado', radicado)
      .single()

    if (error || !request) {
      return { success: false, message: `No se encontró ninguna solicitud con el radicado ${radicado}.` }
    }

    return { success: true, data: withSortedHistory(request) }
  }

  // ── Mode 3: Only document — may return multiple ──────────────────────────
  const { data: requests, error } = await supabase
    .from('requests')
    .select(BASE_SELECT)
    .eq('patient_document_number', documentNumber)
    .order('created_at', { ascending: false })

  if (error || !requests || requests.length === 0) {
    return { success: false, message: `No se encontraron solicitudes para el documento ${documentNumber}.` }
  }

  if (requests.length === 1) {
    return { success: true, data: withSortedHistory(requests[0]) }
  }

  // Multiple requests — return list so patient can pick one
  return {
    success: true,
    multipleResults: requests.map(r => ({
      id: r.id,
      radicado: r.radicado,
      type: r.type,
      status: r.status,
      created_at: r.created_at,
      request_history: (r.request_history || []).sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }))
  }
}

function withSortedHistory(request: any) {
  const history = (request.request_history || []).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return { ...request, request_history: history }
}

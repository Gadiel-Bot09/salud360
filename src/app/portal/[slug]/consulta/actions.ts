'use server'

import { createClient } from '@supabase/supabase-js'

export type TrackResult = {
  success: boolean
  message?: string
  data?: any
  multipleResults?: any[]
}

export async function trackRequest(slug: string, prevState: any, formData: FormData): Promise<TrackResult> {
  const radicado       = (formData.get('radicado') as string || '').trim().toUpperCase()
  const documentNumber = (formData.get('documentNumber') as string || '').trim()

  if (!radicado && !documentNumber) {
    return { success: false, message: 'Ingresa tu número de documento o tu número de radicado para buscar.' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Resolve institution by slug
  const { data: inst } = await supabase
    .from('institutions')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!inst) {
    return { success: false, message: 'Institución no encontrada.' }
  }

  const BASE_SELECT = `
    id, radicado, type, status, created_at,
    request_history ( id, action, created_at, comment, from_status, to_status )
  `

  // ── Mode 1: Both fields — exact single match ─────────────────────────────
  if (radicado && documentNumber) {
    const { data: request, error } = await supabase
      .from('requests')
      .select(BASE_SELECT)
      .eq('radicado', radicado)
      .eq('patient_document_number', documentNumber)
      .eq('institution_id', inst.id)
      .single()

    if (error || !request) {
      return { success: false, message: 'No encontramos ninguna solicitud con ese radicado y número de documento. Verifica los datos e intenta nuevamente.' }
    }

    return { success: true, data: withSortedHistory(request) }
  }

  // ── Mode 2: Only radicado ────────────────────────────────────────────────
  if (radicado) {
    const { data: request, error } = await supabase
      .from('requests')
      .select(BASE_SELECT)
      .eq('radicado', radicado)
      .eq('institution_id', inst.id)
      .single()

    if (error || !request) {
      return { success: false, message: `No encontramos el radicado "${radicado}" en esta institución. Verifica que esté escrito correctamente.` }
    }

    return { success: true, data: withSortedHistory(request) }
  }

  // ── Mode 3: Only document — may return multiple ──────────────────────────
  const { data: requests, error } = await supabase
    .from('requests')
    .select(BASE_SELECT)
    .eq('patient_document_number', documentNumber)
    .eq('institution_id', inst.id)
    .order('created_at', { ascending: false })

  if (error || !requests || requests.length === 0) {
    return { success: false, message: `No encontramos solicitudes registradas para el documento "${documentNumber}" en esta institución. Si radicaste recientemente, espera unos minutos e intenta de nuevo.` }
  }

  if (requests.length === 1) {
    return { success: true, data: withSortedHistory(requests[0]) }
  }

  // Multiple — return list so patient can pick one
  return {
    success: true,
    multipleResults: requests.map(r => ({
      id: r.id,
      radicado: r.radicado,
      type: r.type,
      status: r.status,
      created_at: r.created_at,
      request_history: sortHistory(r.request_history || []),
    })),
  }
}

function sortHistory(history: any[]) {
  return [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

function withSortedHistory(request: any) {
  return { ...request, request_history: sortHistory(request.request_history || []) }
}

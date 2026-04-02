'use server'

import { createClient } from '@supabase/supabase-js'

export type TrackResult = {
  success: boolean;
  message?: string;
  data?: any;
}

export async function trackRequest(prevState: any, formData: FormData): Promise<TrackResult> {
  const radicado = formData.get('radicado') as string
  const documentNumber = formData.get('documentNumber') as string

  if (!radicado || !documentNumber) {
    return { success: false, message: 'El radicado y el número de documento son obligatorios.' }
  }

  // Use Service Role to bypass RLS for this specific query,
  // since tracking is public but we locked SELECT behind RLS.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find the exact request match
  const { data: request, error } = await supabase
    .from('requests')
    .select(`
      id,
      radicado,
      type,
      status,
      created_at,
      patient_data_json,
      request_history (
        id,
        action,
        created_at,
        comment
      )
    `)
    .eq('radicado', radicado.trim())
    .eq('patient_document_number', documentNumber.trim())
    .single()

  if (error || !request) {
    return { success: false, message: 'No se encontró ninguna solicitud con ese radicado y documento. Verifique los datos ingresados.' }
  }

  // Sort history newest to oldest
  const history = request.request_history?.sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ) || []

  return {
     success: true,
     data: {
        ...request,
        request_history: history
     }
  }
}

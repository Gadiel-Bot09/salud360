import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const documentNumber = searchParams.get('documentNumber')?.trim()
  const institutionId  = searchParams.get('institutionId')?.trim()

  if (!documentNumber || documentNumber.length < 4 || !institutionId) {
    return NextResponse.json({ found: false })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('requests')
      .select('patient_document_type, patient_data_json, patient_email')
      .eq('patient_document_number', documentNumber)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ found: false })
    }

    const json = (data.patient_data_json as Record<string, string>) || {}

    return NextResponse.json({
      found: true,
      documentType: data.patient_document_type || '',
      fullName:     json.fullName   || '',
      email:        data.patient_email || '',
      phone:        json.phone      || '',
      // All dynamic field values keyed by their human-readable label (e.g. "Entidad / EPS")
      dynamicFields: json,
    })
  } catch (err) {
    console.error('Patient lookup error:', err)
    return NextResponse.json({ found: false })
  }
}

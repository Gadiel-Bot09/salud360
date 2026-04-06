import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmailConfirmation } from '@/lib/resend'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Core Fields Extraction
        const coreKeys = ['documentType', 'documentNumber', 'fullName', 'email', 'phone', 'requestType', 'institutionId']
        const documentType = formData.get('documentType') as string
        const documentNumber = formData.get('documentNumber') as string
        const fullName = formData.get('fullName') as string
        const email = formData.get('email') as string
        const phone = formData.get('phone') as string
        const requestType = formData.get('requestType') as string
        const institutionId = formData.get('institutionId') as string

        // 2. Dynamic JSON Fields Extraction (Any non-core field except files)
        const patientData: Record<string, string> = {}
        const filesToUpload: File[] = []
        const entries = Array.from(formData.entries())

        for (const [key, value] of entries) {
             if (coreKeys.includes(key)) continue

             if (value instanceof File) {
                 if (value.size > 0) filesToUpload.push(value)
             } else if (key.startsWith('cond__')) {
                 // Conditional sub-field: cond__{parentFieldId}__{subFieldId}
                 // Store as "ParentLabel > SubLabel" in patientData using the key directly
                 patientData[key] = value as string
             } else {
                 patientData[key] = value as string
             }
        }


        // Validate basic rules
        if (!institutionId || !documentNumber || !email) {
            return NextResponse.json({ error: 'Datos básicos incompletos.' }, { status: 400 })
        }

        // Ensure core patient fields are also stored in the JSON for easy retrieval in admin UI
        patientData['fullName'] = fullName || ''
        patientData['phone'] = phone || ''

        // Generate Radicado: RAD-{AÑO}-{SYS}-{SECUENCIAL}
        const year = new Date().getFullYear()
        const shortId = Math.random().toString(36).substring(2, 8).toUpperCase()
        const radicado = `RAD-${year}-SYS-${shortId}`

        // Insert Request (Relacionada a su Institución por RLS)
        const { data: requestData, error: requestError } = await supabase
            .from('requests')
            .insert({
                radicado,
                institution_id: institutionId,
                patient_document_type: documentType,
                patient_document_number: documentNumber,
                patient_email: email,
                patient_data_json: patientData,
                type: requestType,
                status: 'received'
            })
            .select('id')
            .single()

        if (requestError) {
            console.error('Request insertion error:', requestError)
            return NextResponse.json({ error: 'Error al registrar la solicitud en base de datos.' }, { status: 500 })
        }

        const requestId = requestData.id

        // Request History Log
        await supabase.from('request_history').insert({
            request_id: requestId,
            action: 'Solicitud Creada',
            from_status: 'none',
            to_status: 'received',
            comment: 'El paciente radicó la solicitud mediante el portal principal dinámico.'
        })

        // File Processing
        if (filesToUpload.length > 0) {
            for (const file of filesToUpload) {
                const fileExt = file.name.split('.').pop()
                const safeName = `${Math.random().toString(36).substring(7)}.${fileExt}`
                const uploadPath = `${institutionId}/${requestId}/${safeName}`

                const { error: uploadError } = await supabase.storage
                    .from('medical_documents')
                    .upload(uploadPath, file)

                if (!uploadError) {
                    await supabase.from('request_attachments').insert({
                        request_id: requestId,
                        file_name: file.name,
                        file_path: uploadPath,
                        file_type: file.type,
                        file_size: file.size
                    })
                } else {
                     console.error('Error uploading file:', uploadError)
                }
            }
        }

        // Shoot Email
        try {
            await sendEmailConfirmation(email, radicado, fullName, requestType)
        } catch(e) { console.error('Email failed, but request succeeded:', e) }

        return NextResponse.json({ success: true, radicado })
        
    } catch (e) {
        console.error('Unhandled Server Error: ', e)
        return NextResponse.json({ error: 'Fallo Crítico.' }, { status: 500 })
    }
}

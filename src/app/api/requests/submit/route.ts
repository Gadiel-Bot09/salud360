import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmailConfirmation } from '@/lib/resend'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

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
        // filesToUpload stores { file, label? } so we can save the document label in the attachment record
        const filesToUpload: { file: File; docLabel?: string }[] = []
        const entries = Array.from(formData.entries())

        // Collect human-readable labels for form fields: label__<inputName> = "Nombre Campo"
        const labels: Record<string, string> = {}
        // Collect document labels for labeled file zones: filelabel__<inputName> = "Historia Clínica"
        const fileLabels: Record<string, string> = {}

        for (const [key, value] of entries) {
            if (key.startsWith('label__')) {
                labels[key.replace('label__', '')] = value as string
            }
            if (key.startsWith('filelabel__')) {
                fileLabels[key.replace('filelabel__', '')] = value as string
            }
        }

        for (const [key, value] of entries) {
             if (coreKeys.includes(key) || key.startsWith('label__') || key.startsWith('filelabel__') || key === '_requestTypeId') continue

             if (value instanceof File) {
                 if (value.size > 0) {
                     // Look up the document label for this input name (e.g. "Historia Clínica")
                     filesToUpload.push({ file: value, docLabel: fileLabels[key] })
                 }
             } else {
                 const finalKey = labels[key] || key
                 patientData[finalKey] = value as string
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
            const s3 = new S3Client({
                region: 'us-east-1',
                endpoint: process.env.MINIO_ENDPOINT,
                credentials: {
                    accessKeyId: process.env.MINIO_ACCESS_KEY!,
                    secretAccessKey: process.env.MINIO_SECRET_KEY!
                },
                forcePathStyle: true
            })
            const bucketName = process.env.MINIO_BUCKET_NAME!

            for (const { file, docLabel } of filesToUpload) {
                const fileExt = file.name.split('.').pop()
                const safeName = `${Math.random().toString(36).substring(7)}.${fileExt}`
                const uploadPath = `${institutionId}/${requestId}/${safeName}`

                try {
                    const arrayBuffer = await file.arrayBuffer()
                    const buffer = Buffer.from(arrayBuffer)
                    
                    await s3.send(new PutObjectCommand({
                        Bucket: bucketName,
                        Key: uploadPath,
                        Body: buffer,
                        ContentType: file.type
                    }))

                    await supabase.from('request_attachments').insert({
                        request_id: requestId,
                        file_name: docLabel ? `[${docLabel}] ${file.name}` : file.name,
                        file_path: uploadPath,
                        file_type: file.type,
                        file_size: file.size
                    })
                } catch(uploadError: any) {
                     console.error('Error uploading file to MinIO:', uploadError)
                     return NextResponse.json({ error: `Fallo Cloud Storage: ${uploadError?.message || 'Unknown'}` }, { status: 500 })
                }
            }
        }

        // Shoot Email
        try {
            await sendEmailConfirmation(email, radicado, fullName, requestType, patientData)
        } catch(e) { console.error('Email failed, but request succeeded:', e) }

        return NextResponse.json({ success: true, radicado })
        
    } catch (e) {
        console.error('Unhandled Server Error: ', e)
        return NextResponse.json({ error: 'Fallo Crítico.' }, { status: 500 })
    }
}

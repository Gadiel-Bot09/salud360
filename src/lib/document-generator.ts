import { createClient } from '@supabase/supabase-js'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import ImageModule from 'docxtemplater-image-module-free'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

export async function generateLegalDocuments(
  institutionId: string,
  requestId: string,
  patientData: Record<string, any>,
  requestType: string
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Obtener plantillas de la institución
  const { data: templates } = await supabase
    .from('legal_templates')
    .select('*')
    .eq('institution_id', institutionId)

  if (!templates || templates.length === 0) return

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

  for (const template of templates) {
    try {
      // Regla de Trigger: si hay trigger_condition, validar
      // Para este MVP, si la plantilla se llama algo con "Historia Clinica" y el tramite no, saltamos.
      // Puedes implementar lógica más robusta con template.trigger_condition
      
      let finalBuffer: Buffer | null = null
      let fileName = ''
      let fileExt = ''
      let mimeType = ''

      if (template.template_type === 'docx' && template.docx_url) {
        // Descargar docx de MinIO
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: template.docx_url
        })
        const s3Response = await s3.send(getCommand)
        const fileBytes = await s3Response.Body?.transformToByteArray()
        
        if (!fileBytes) continue

        const zip = new PizZip(fileBytes)
        
        // Configurar módulo de imágenes para la firma
        const imageOptions = {
          centered: false,
          getImage: function(tagValue: string, tagName: string) {
            return new Promise<Buffer>((resolve, reject) => {
              if (tagValue && tagValue.startsWith('data:image')) {
                // Es base64
                const base64Data = tagValue.replace(/^data:image\/\w+;base64,/, '')
                resolve(Buffer.from(base64Data, 'base64'))
              } else {
                reject(new Error("No valid image data"))
              }
            })
          },
          getSize: function(img: any, tagValue: string, tagName: string) {
             return [150, 50] // ancho y alto de la firma
          }
        }
        
        const imageModule = new ImageModule(imageOptions)

        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          modules: [imageModule]
        })

        // Inyectamos todas las variables de patientData
        // Ejemplo: si en patientData viene la llave "Firma Digital", buscará {%Firma Digital} si configuramos docxtemplater para imágenes, o simplemente la llave si la imagen está soportada.
        // NOTA: docxtemplater-image-module-free espera {%firma}
        // Así que renombramos cualquier llave que tenga "Firma" o base64 para que tenga el tag esperado.
        
        const renderData: any = { ...patientData }
        // Buscar campos de firma para el docx (ej: si llave incluye "Firma", duplicar con nombre seguro)
        Object.keys(renderData).forEach(k => {
          if (typeof renderData[k] === 'string' && renderData[k].startsWith('data:image')) {
            renderData['firma'] = renderData[k]
          }
        })

        // Resolver asíncronamente
        await doc.resolveData(renderData)
        doc.render()
        
        finalBuffer = doc.getZip().generate({
          type: 'nodebuffer',
          compression: 'DEFLATE'
        })

        fileName = `[Generado] ${template.name}.docx`
        fileExt = 'docx'
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

      } else if (template.template_type === 'html') {
        // Generar un HTML simple inyectando variables (MVP)
        let html = template.html_content || ''
        Object.keys(patientData).forEach(key => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
          
          if (typeof patientData[key] === 'string' && patientData[key].startsWith('data:image')) {
             html = html.replace(regex, `<img src="${patientData[key]}" style="max-height: 80px;" />`)
          } else {
             html = html.replace(regex, patientData[key] || '')
          }
        })

        finalBuffer = Buffer.from(html, 'utf-8')
        fileName = `[Generado] ${template.name}.html`
        fileExt = 'html'
        mimeType = 'text/html'
      }

      if (finalBuffer) {
        // Subir a MinIO como Attachment
        const safeName = `${Math.random().toString(36).substring(7)}.${fileExt}`
        const uploadPath = `${institutionId}/${requestId}/${safeName}`

        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: uploadPath,
            Body: finalBuffer,
            ContentType: mimeType
        }))

        await supabase.from('request_attachments').insert({
            request_id: requestId,
            file_name: fileName,
            file_path: uploadPath,
            file_type: mimeType,
            file_size: finalBuffer.length
        })
      }

    } catch (e) {
      console.error(`Error generando plantilla ${template.name}:`, e)
    }
  }
}

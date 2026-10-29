import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { institutionId, files } = body

    if (!institutionId || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 })
    }

    const s3 = new S3Client({
      region: 'us-east-1',
      endpoint: process.env.MINIO_ENDPOINT,
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY!,
        secretAccessKey: process.env.MINIO_SECRET_KEY!,
      },
      forcePathStyle: true,
    })

    const bucketName = process.env.MINIO_BUCKET_NAME!
    const results = []

    for (let i = 0; i < files.length; i++) {
      const fileInfo = files[i]
      const originalName = fileInfo.name || `documento_${i + 1}.bin`
      const rawExt = originalName.split('.').pop() || 'bin'
      const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      const randomStr = Math.random().toString(36).substring(2, 9)
      const safeKey = `${institutionId}/radicados/${Date.now()}_${randomStr}.${fileExt}`

      const contentType = fileInfo.type || 'application/octet-stream'

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: safeKey,
        ContentType: contentType,
      })

      // URL válida por 15 minutos (900s)
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 })

      results.push({
        fileId: fileInfo.id || String(i),
        uploadUrl,
        key: safeKey,
        fileName: originalName,
        fileType: contentType,
        fileSize: fileInfo.size || 0,
        docLabel: fileInfo.docLabel || '',
      })
    }

    return NextResponse.json({ success: true, files: results })
  } catch (error: any) {
    console.error('Error generating presigned upload URLs:', error)
    return NextResponse.json({ error: 'Error al autorizar la subida de archivos.' }, { status: 500 })
  }
}

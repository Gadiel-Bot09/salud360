'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function uploadLogoToMinio(file: File, institutionName: string): Promise<string | null> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: process.env.MINIO_ENDPOINT,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
    forcePathStyle: true,
  })

  const ext = file.name.split('.').pop() ?? 'png'
  const safeName = `logo-${Math.random().toString(36).substring(7)}.${ext}`
  const slug = institutionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  const uploadPath = `institutions/${slug}/${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  await s3.send(new PutObjectCommand({
    Bucket: process.env.MINIO_BUCKET_NAME!,
    Key: uploadPath,
    Body: buffer,
    ContentType: file.type,
  }))

  return `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET_NAME}/${uploadPath}`
}

export async function createInstitution(formData: FormData) {
  const name = formData.get('name') as string
  const logoFile = formData.get('logo_file') as File | null

  const supabase = await createClient()

  // Generate URL friendly slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

  // Upload logo to MinIO if provided
  let logoUrl: string | null = null
  if (logoFile && logoFile.size > 0) {
    logoUrl = await uploadLogoToMinio(logoFile, name)
  }

  const { error } = await supabase
    .from('institutions')
    .insert({ name, logo_url: logoUrl, slug })

  if (error) {
    console.error('Create institution error:', error)
    return { success: false, error: 'No se pudo crear la institución. ¿Eres Super Admin?' }
  }

  revalidatePath('/admin/institutions')
  return { success: true }
}

export async function updateInstitution(id: string, formData: FormData) {
  const name = formData.get('name') as string
  const logoFile = formData.get('logo_file') as File | null

  const supabase = await createClient()

  let logoUrl: string | null = (formData.get('existing_logo_url') as string) || null

  // Upload new logo to MinIO if a file was selected
  if (logoFile && logoFile.size > 0) {
    const uploaded = await uploadLogoToMinio(logoFile, name)
    if (uploaded) logoUrl = uploaded
  }

  const { error } = await supabase
    .from('institutions')
    .update({ name, logo_url: logoUrl })
    .eq('id', id)

  if (error) {
    console.error('Update institution error:', error)
    return { success: false, error: 'No se pudo actualizar la institución.' }
  }

  revalidatePath('/admin/institutions')
  return { success: true }
}

export async function deleteInstitution(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('institutions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Delete institution error:', error)
    return { success: false, error: 'No se pudo eliminar la institución.' }
  }

  revalidatePath('/admin/institutions')
  return { success: true }
}

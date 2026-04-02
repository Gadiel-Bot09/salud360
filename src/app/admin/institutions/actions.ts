'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createInstitution(formData: FormData) {
  const name = formData.get('name') as string
  const logoUrl = formData.get('logo_url') as string || null

  const supabase = await createClient()

  // Relies on RLS 'Super Admin' policy
  const { error } = await supabase
    .from('institutions')
    .insert({ name, logo_url: logoUrl })

  if (error) {
    console.error('Create institution error:', error)
    return { success: false, error: 'No se pudo crear la institución. ¿Eres Super Admin?' }
  }

  revalidatePath('/admin/institutions')
  return { success: true }
}

export async function updateInstitution(id: string, formData: FormData) {
  const name = formData.get('name') as string
  const logoUrl = formData.get('logo_url') as string || null

  const supabase = await createClient()

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

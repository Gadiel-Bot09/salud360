'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function sb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthFilter() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const supabase = sb()
  const { data: myProfile } = await supabase.from('users').select('institution_id, roles(name)').eq('id', user.id).single()
  
  const isSuperAdmin = myProfile?.roles?.name === 'Super Admin'
  return { isSuperAdmin, institutionId: myProfile?.institution_id }
}

export interface ResponseTemplate {
  id: string
  institution_id: string | null
  name: string
  body: string
  created_at: string
}

export async function getResponseTemplates(): Promise<ResponseTemplate[]> {
  const filter = await getAuthFilter()
  if (!filter) return []

  let query = sb().from('response_templates').select('*').order('name')
  if (!filter.isSuperAdmin && filter.institutionId) {
    query = query.eq('institution_id', filter.institutionId)
  }

  const { data, error } = await query
  if (error) { console.error(error); return [] }
  return data || []
}

export async function createResponseTemplate(formData: FormData) {
  'use server'
  const filter = await getAuthFilter()
  if (!filter) return { error: 'No autorizado' }

  const name = formData.get('name') as string
  const body = formData.get('body') as string
  if (!name || !body) return { error: 'Nombre y cuerpo son obligatorios' }

  const { error } = await sb().from('response_templates').insert({ 
    name, 
    body,
    institution_id: filter.isSuperAdmin ? null : filter.institutionId 
  })

  if (error) { console.error(error); return { error: 'Error al guardar plantilla' } }
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function updateResponseTemplate(formData: FormData) {
  'use server'
  const id   = formData.get('id') as string
  const name = formData.get('name') as string
  const body = formData.get('body') as string
  const { error } = await sb().from('response_templates').update({ name, body }).eq('id', id)
  if (error) { console.error(error); return { error: 'Error al actualizar' } }
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function deleteResponseTemplate(id: string) {
  'use server'
  const { error } = await sb().from('response_templates').delete().eq('id', id)
  if (error) { console.error(error); return { error: 'Error al eliminar' } }
  revalidatePath('/admin/settings')
  return { success: true }
}

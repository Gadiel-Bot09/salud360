'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export interface Branch {
  id: string
  institution_id: string
  name: string
  address: string
  phone: string | null
  active: boolean
  created_at: string
}

function sb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getInstitutionId(): Promise<string | null> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const { data } = await sb().from('users').select('institution_id').eq('id', user.id).single()
  return data?.institution_id || null
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function getBranches(): Promise<Branch[]> {
  const institutionId = await getInstitutionId()
  if (!institutionId) return []

  const { data, error } = await sb()
    .from('branches')
    .select('*')
    .eq('institution_id', institutionId)
    .order('name')

  if (error) { console.error('getBranches:', error); return [] }
  return data || []
}

// ── CREATE ────────────────────────────────────────────────────────────────────
export async function createBranch(formData: FormData) {
  'use server'
  const institutionId = await getInstitutionId()
  if (!institutionId) return { error: 'No autorizado' }

  const name    = (formData.get('name') as string)?.trim()
  const address = (formData.get('address') as string)?.trim()
  const phone   = (formData.get('phone') as string)?.trim() || null

  if (!name)    return { error: 'El nombre de la sede es obligatorio.' }
  if (!address) return { error: 'La dirección es obligatoria.' }

  const { error } = await sb().from('branches').insert({
    institution_id: institutionId,
    name,
    address,
    phone
  })

  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una sede con ese nombre.' }
    return { error: error.message }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/admin/requests')
  return { success: true }
}

// ── UPDATE ────────────────────────────────────────────────────────────────────
export async function updateBranch(formData: FormData) {
  'use server'
  const id      = formData.get('id') as string
  const name    = (formData.get('name') as string)?.trim()
  const address = (formData.get('address') as string)?.trim()
  const phone   = (formData.get('phone') as string)?.trim() || null

  if (!name)    return { error: 'El nombre es obligatorio.' }
  if (!address) return { error: 'La dirección es obligatoria.' }

  const { error } = await sb().from('branches').update({ name, address, phone }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  revalidatePath('/admin/requests')
  return { success: true }
}

// ── TOGGLE ACTIVE ─────────────────────────────────────────────────────────────
export async function toggleBranchActive(id: string, active: boolean) {
  'use server'
  const { error } = await sb().from('branches').update({ active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/settings')
  revalidatePath('/admin/requests')
  return { success: true }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function deleteBranch(id: string) {
  'use server'
  const { error } = await sb().from('branches').delete().eq('id', id)
  if (error) return { error: 'No se puede eliminar: la sede puede estar en uso.' }
  revalidatePath('/admin/settings')
  revalidatePath('/admin/requests')
  return { success: true }
}

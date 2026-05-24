'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createCustomRole(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const institutionId = formData.get('institutionId') as string || null
  
  // Extract permissions from formData (all fields starting with perm_)
  const permissions: string[] = []
  formData.forEach((value, key) => {
    if (key.startsWith('perm_') && value === 'on') {
      permissions.push(key.replace('perm_', ''))
    }
  })

  // Ensure current user is authenticated and authorized
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: myProfile } = await authClient.from('users').select('role_id, institution_id, roles(name, permissions)').eq('id', user.id).single()
  const isSuperAdmin = myProfile?.roles?.name === 'Super Admin'
  const myPerms = (myProfile?.roles?.permissions as string[]) || []
  const hasManageRoles = isSuperAdmin || myPerms.includes('roles.manage') || myPerms.includes('*')

  if (!hasManageRoles) {
      return { success: false, error: 'No tienes permisos para crear roles.' }
  }

  const targetInstitution = isSuperAdmin ? institutionId : myProfile?.institution_id

  if (!targetInstitution) {
     return { success: false, error: 'Falta la institución para crear el rol personalizado.' }
  }

  const { error } = await supabaseAdmin.from('roles').insert({
    name,
    description,
    permissions,
    is_system: false,
    institution_id: targetInstitution
  })

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      return { success: false, error: 'Ya existe un rol con ese nombre en esta institución.' }
    }
    return { success: false, error: 'Error al crear el rol: ' + error.message }
  }

  revalidatePath('/admin/roles')
  revalidatePath('/admin/users') // To update the dropdowns
  
  return { success: true, message: 'Rol creado exitosamente.' }
}

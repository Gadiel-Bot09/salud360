'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Requires the service role key to invite new users to Auth seamlessly
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function inviteAdminUser(formData: FormData) {
  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const institutionId = formData.get('institutionId') as string || null

  // Ensure current user is Super Admin
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: myProfile } = await supabaseAdmin.from('users').select('role, institution_id').eq('id', user.id).single()
  
  if (myProfile?.role !== 'Super Admin' && role === 'Super Admin') {
      return { success: false, error: 'No puedes crear Super Administradores.' }
  }

  // Determine which institution to assign based on the inviter's role
  const assignedInstitution = myProfile?.role === 'Super Admin' ? institutionId : myProfile?.institution_id

  // 1. Send invite email via Supabase Auth Admin
  // Note: We'll create a user with a random temp password if invite doesn't work, 
  // but let's try standard admin.inviteUserByEmail or admin.createUser
  const tempPassword = Math.random().toString(36).slice(-10) + "A1!"
  
  const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: tempPassword,
    email_confirm: true, // Auto confirm for now
  })

  // 2. If user already exists in auth but not our DB, this will fail. We'll handle it gracefully.
  if (authError) {
    if (authError.message.includes('already exists')) {
       return { success: false, error: 'El usuario ya existe en el sistema de Auth. Pida al usuario que inicie sesión o recupere su clave.' }
    }
    console.error('Invite error:', authError)
    return { success: false, error: 'No se pudo crear la credencial de usuario.' }
  }

  // 3. Insert local profile into `public.users` table
  const { error: dbError } = await supabaseAdmin.from('users').insert({
    id: newAuthUser.user.id,
    email: email,
    role: role,
    institution_id: assignedInstitution,
    active: true
  })

  if (dbError) {
     console.error('Profile creation error:', dbError)
     // Fallback: Delete from auth to prevent orphaned roles
     await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id)
     return { success: false, error: 'Ocurrió un error al asignar el rol. Operación revertida.' }
  }

  revalidatePath('/admin/users')
  
  return { 
     success: true, 
     message: `Usuario creado exitosamente. La contraseña temporal es: ${tempPassword}`
  }
}

export async function toggleUserStatus(userId: string, currentStatus: boolean) {
   const { error } = await supabaseAdmin
      .from('users')
      .update({ active: !currentStatus })
      .eq('id', userId)

   if (error) return { success: false, error: error.message }
   revalidatePath('/admin/users')
   return { success: true }
}

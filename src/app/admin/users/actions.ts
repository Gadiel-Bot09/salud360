'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendWelcomeAdminEmail } from '@/lib/resend'
import { headers } from 'next/headers'

// Requires the service role key to invite new users to Auth seamlessly
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function inviteAdminUser(formData: FormData) {
  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const institutionId = formData.get('institutionId') as string || null

  // Ensure current user is authenticated
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: myProfile } = await supabaseAdmin.from('users').select('role, institution_id').eq('id', user.id).single()
  
  if (myProfile?.role !== 'Super Admin' && role === 'Super Admin') {
      return { success: false, error: 'No puedes crear Super Administradores.' }
  }

  // Determine which institution to assign based on the inviter's role
  const assignedInstitution = myProfile?.role === 'Super Admin' ? institutionId || null : myProfile?.institution_id

  // Get institution name for the welcome email
  let institutionName: string | null = null
  if (assignedInstitution) {
    const { data: inst } = await supabaseAdmin.from('institutions').select('name').eq('id', assignedInstitution).single()
    institutionName = inst?.name || null
  }

  // Generate temp password
  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'

  const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already exists')) {
       return { success: false, error: 'El usuario ya existe en el sistema. Pida que inicie sesión o recupere su clave.' }
    }
    return { success: false, error: 'No se pudo crear la credencial de usuario.' }
  }

  // Insert local profile
  const { error: dbError } = await supabaseAdmin.from('users').insert({
    id: newAuthUser.user.id,
    email,
    role,
    institution_id: assignedInstitution,
    active: true,
  })

  if (dbError) {
     await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id)
     return { success: false, error: 'Error al asignar el rol. Operación revertida.' }
  }

  // Send welcome email with credentials
  const headersList = await headers()
  const host = headersList.get('host') || 'salud360.sinuhub.com'
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const loginUrl = `${proto}://${host}/login`

  await sendWelcomeAdminEmail(email, tempPassword, role, institutionName, loginUrl)

  revalidatePath('/admin/users')
  
  return { 
    success: true, 
    tempPassword,
    message: `Usuario ${email} creado exitosamente.`,
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

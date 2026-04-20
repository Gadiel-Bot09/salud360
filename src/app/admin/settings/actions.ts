'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Change password ───────────────────────────────────────────────────────────
export async function changePassword(formData: FormData) {
  const newPassword = formData.get('newPassword') as string
  const confirm = formData.get('confirmPassword') as string

  if (newPassword !== confirm) {
    return { success: false, error: 'Las contraseñas no coinciden.' }
  }
  if (newPassword.length < 8) {
    return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) return { success: false, error: error.message }
  return { success: true, message: 'Contraseña actualizada correctamente.' }
}

// ── Update institution branding (Super Admin or Admin Institución) ─────────────
export async function updateInstitutionBranding(formData: FormData) {
  const institutionId = formData.get('institutionId') as string
  const name = formData.get('name') as string
  const logoUrl = formData.get('logo_url') as string | null
  const slug = formData.get('slug') as string
  const primaryColor = formData.get('primaryColor') as string
  const secondaryColor = formData.get('secondaryColor') as string
  const tagline = formData.get('tagline') as string | null
  const description = formData.get('description') as string | null
  const address = formData.get('address') as string | null
  const phone = formData.get('phone') as string | null
  const contactEmail = formData.get('contact_email') as string | null
  const website = formData.get('website') as string | null
  const privacyPolicy = formData.get('privacy_policy') as string | null

  if (!institutionId) return { success: false, error: 'ID de institución requerido.' }

  // Sanitize slug
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

  const { error } = await supabaseAdmin
    .from('institutions')
    .update({
      name,
      logo_url: logoUrl || null,
      slug: cleanSlug,
      colors: { primary: primaryColor, secondary: secondaryColor },
      tagline: tagline || null,
      description: description || null,
      address: address || null,
      phone: phone || null,
      contact_email: contactEmail || null,
      website: website || null,
      privacy_policy: privacyPolicy || null,
    })
    .eq('id', institutionId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/settings')
  return { success: true, message: 'Configuración institucional actualizada.' }
}

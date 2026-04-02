'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveFormTemplate(fields: any[], templateName: string) {
  const supabase = await createClient()

  // Verify Role & Get Institution
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: userProfile } = await supabase.from('users').select('institution_id').eq('id', user.id).single()
  if (!userProfile?.institution_id) {
     return { success: false, error: 'No tienes una institución asignada para configurar formularios.' }
  }

  // Check if institution already has a template
  const { data: existingTemplate } = await supabase
    .from('form_templates')
    .select('id')
    .eq('institution_id', userProfile.institution_id)
    .single()

  let error;

  if (existingTemplate) {
    // Update existing active template
    const { error: updateError } = await supabase
      .from('form_templates')
      .update({
         name: templateName,
         fields_json: fields
      })
      .eq('id', existingTemplate.id)
    error = updateError;
  } else {
    // Insert new template
    const { error: insertError } = await supabase
      .from('form_templates')
      .insert({
         institution_id: userProfile.institution_id,
         name: templateName,
         fields_json: fields,
         is_active: true
      })
    error = insertError;
  }

  if (error) {
     console.error('Save template error:', error)
     return { success: false, error: 'Error persistiendo la plantilla en base de datos.' }
  }

  revalidatePath('/admin/forms')
  return { success: true }
}

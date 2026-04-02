'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getInstitutionTemplate(institutionId: string) {
  if (!institutionId) return null

  const { data: template } = await supabase
    .from('form_templates')
    .select('fields_json')
    .eq('institution_id', institutionId)
    .single()

  return template?.fields_json || null
}

export async function getActiveInstitutions() {
  const { data } = await supabase
    .from('institutions')
    .select('id, name, slug')
    .order('name')
  return data
}

export async function getInstitutionBySlug(slug: string) {
  if (!slug) return null
  const { data } = await supabase
    .from('institutions')
    .select('id, name, logo_url, colors')
    .eq('slug', slug)
    .single()
  return data
}

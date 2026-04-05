import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './settings-client'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: userProfile } = await supabase
    .from('users')
    .select('role, institution_id')
    .eq('id', user?.id ?? '')
    .single()

  // Fetch institution if the user has one assigned
  let institution = null
  if (userProfile?.institution_id) {
    const { data } = await supabase
      .from('institutions')
      .select('id, name, slug, logo_url, colors')
      .eq('id', userProfile.institution_id)
      .single()
    institution = data
  }

  // Determine the current site origin for portal URL preview
  const headersList = await headers()
  const host = headersList.get('host') || 'salud360.sinuhub.com'
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const siteUrl = `${proto}://${host}`

  return (
    <SettingsClient
      userEmail={user?.email ?? ''}
      userRole={userProfile?.role ?? 'Gestor'}
      institution={institution}
      siteUrl={siteUrl}
    />
  )
}

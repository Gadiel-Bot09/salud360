import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Toaster } from '@/components/ui/toaster'
import { getPendingAppointmentsCountToday } from '@/app/admin/appointments/actions'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { WelcomeNotifier } from '@/components/admin/welcome-notifier'
import { getSeasonalConfig } from '@/lib/seasonal-theme'

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: userProfile } = await supabase
        .from('users')
        .select('full_name, role_id, institution_id, roles(name, permissions, is_system), institutions(id, name, settings_json)')
        .eq('id', user.id)
        .single()
    const profile = userProfile as any
    const roleName = profile?.roles?.name || ''
    const permissions = (profile?.roles?.permissions as string[]) || []
    const isSuperAdmin = roleName === 'Super Admin'
    const hasPerm = (p: string) => isSuperAdmin || permissions.includes('*') || permissions.includes(p)

    const pendingAppointmentsCount = hasPerm('appointments.view') ? await getPendingAppointmentsCountToday() : 0

    // Seasonal Theme resolution (Halloween / Christmas / Auto / Disabled)
    const seasonalSetting = (profile?.institutions as any)?.settings_json?.seasonal_theme || 'auto'
    const seasonal = getSeasonalConfig(seasonalSetting)
    const institutionName = (profile?.institutions as any)?.name || null

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Modern Interactive Sidebar */}
            <AdminSidebar
                permissions={{
                    requestsView:       hasPerm('requests.view'),
                    appointmentsView:   hasPerm('appointments.view'),
                    reportsView:        hasPerm('reports.view'),
                    whatsappLogsView:   hasPerm('whatsapp_logs.view'),
                    whatsappManage:     hasPerm('whatsapp.manage'),
                    formsManage:        hasPerm('forms.manage'),
                    templatesManage:    hasPerm('templates.manage'),
                    usersManage:        hasPerm('users.manage'),
                    rolesManage:        hasPerm('roles.manage'),
                    institutionsManage: isSuperAdmin,
                    settingsManage:     hasPerm('settings.manage'),
                }}
                pendingAppointmentsCount={pendingAppointmentsCount}
                seasonalTheme={seasonal.activeTheme}
                institutionName={institutionName}
                isSuperAdmin={isSuperAdmin}
                user={{
                    email: user.email || 'usuario@salud360.com',
                    name: profile?.full_name || (user.user_metadata as any)?.full_name || null,
                    roleName,
                }}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full">
                {children}
                <WelcomeNotifier
                    fullName={profile?.full_name || (user.user_metadata as any)?.full_name || null}
                    email={user.email}
                    seasonalTheme={seasonal.activeTheme}
                />
                <Toaster />
            </main>
        </div>
    )
}

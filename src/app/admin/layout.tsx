import { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
    BarChart3,
    Inbox,
    Settings,
    Users,
    LogOut,
    Hospital,
    Building2,
    FileEdit,
    BarChart2,
    CalendarDays,
    MessageSquare,
    FileText
} from 'lucide-react'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { getPendingAppointmentsCountToday } from '@/app/admin/appointments/actions'

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }
    
    const { data: userProfile } = await supabase.from('users').select('role_id, roles(name, permissions, is_system)').eq('id', user.id).single()
    const roleName = userProfile?.roles?.name || '';
    const permissions = (userProfile?.roles?.permissions as string[]) || [];
    const isSuperAdmin = roleName === 'Super Admin';
    const hasPerm = (p: string) => isSuperAdmin || permissions.includes('*') || permissions.includes(p);

    const pendingAppointmentsCount = hasPerm('appointments.view') ? await getPendingAppointmentsCountToday() : 0;

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col items-center py-6 text-slate-300">
                <div className="flex items-center space-x-2 text-white mb-10 w-full px-6">
                    <Image src="/logo-white.svg" alt="Salud360 Logo" width={140} height={35} priority />
                </div>

                <nav className="flex-1 w-full flex flex-col space-y-2 px-4">
                    <Link href="/admin/dashboard" className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-slate-800 text-white transition">
                        <BarChart3 className="h-5 w-5 text-teal-400" />
                        <span>Dashboard</span>
                    </Link>
                    {hasPerm('requests.view') && (
                        <Link href="/admin/requests" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                            <Inbox className="h-5 w-5" />
                            <span>Solicitudes</span>
                        </Link>
                    )}
                    {hasPerm('users.manage') && (
                        <Link href="/admin/users" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                            <Users className="h-5 w-5" />
                            <span>Usuarios</span>
                        </Link>
                    )}
                    {hasPerm('roles.manage') && (
                        <Link href="/admin/roles" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                            <Users className="h-5 w-5" />
                            <span>Roles</span>
                        </Link>
                    )}
                    {hasPerm('forms.manage') && (
                        <Link href="/admin/forms" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                            <FileEdit className="h-5 w-5" />
                            <span>Formularios</span>
                        </Link>
                    )}
                    {hasPerm('templates.manage') && (
                        <Link href="/admin/templates" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                            <FileText className="h-5 w-5 text-indigo-400" />
                            <span>Plantillas Legales</span>
                        </Link>
                    )}
                    {hasPerm('reports.view') && (
                        <Link href="/admin/reports" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                            <BarChart2 className="h-5 w-5 text-teal-400" />
                            <span>Reportes</span>
                        </Link>
                    )}
                    {hasPerm('appointments.view') && (
                        <Link href="/admin/appointments" className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition group">
                            <div className="flex items-center space-x-3">
                                <CalendarDays className="h-5 w-5 text-teal-400 group-hover:scale-110 transition-transform" />
                                <span>Citas</span>
                            </div>
                            {pendingAppointmentsCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                    {pendingAppointmentsCount}
                                </span>
                            )}
                        </Link>
                    )}
                    {hasPerm('whatsapp_logs.view') && (
                        <Link href="/admin/whatsapp-logs" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                            <MessageSquare className="h-5 w-5 text-green-400" />
                            <span>Logs WhatsApp</span>
                        </Link>
                    )}
                    {isSuperAdmin && (
                        <Link href="/admin/institutions" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                            <Building2 className="h-5 w-5" />
                            <span>Instituciones</span>
                        </Link>
                    )}
                    {hasPerm('settings.manage') && (
                        <Link href="/admin/settings" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                            <Settings className="h-5 w-5" />
                            <span>Configuración</span>
                        </Link>
                    )}
                </nav>

                <div className="w-full px-4 mt-auto">
                    <div className="bg-slate-800 rounded-lg p-4 mb-4">
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    <form action={logout}>
                        <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800">
                            <LogOut className="mr-2 h-4 w-4" />
                            Cerrar Sesión
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full">
                {children}
                <Toaster />
            </main>
        </div>
    )
}

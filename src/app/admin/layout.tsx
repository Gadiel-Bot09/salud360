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
    CalendarDays
} from 'lucide-react'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }
    
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', user.id).single()

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
                    <Link href="/admin/requests" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                        <Inbox className="h-5 w-5" />
                        <span>Solicitudes</span>
                    </Link>
                    <Link href="/admin/users" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                        <Users className="h-5 w-5" />
                        <span>Usuarios</span>
                    </Link>
                    <Link href="/admin/forms" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                        <FileEdit className="h-5 w-5" />
                        <span>Formularios</span>
                    </Link>
                    <Link href="/admin/reports" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                        <BarChart2 className="h-5 w-5 text-teal-400" />
                        <span>Reportes</span>
                    </Link>
                    <Link href="/admin/appointments" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                        <CalendarDays className="h-5 w-5 text-teal-400" />
                        <span>Citas</span>
                    </Link>
                    {userProfile?.role === 'Super Admin' && (
                        <Link href="/admin/institutions" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                            <Building2 className="h-5 w-5" />
                            <span>Instituciones</span>
                        </Link>
                    )}
                    <Link href="/admin/settings" className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
                        <Settings className="h-5 w-5" />
                        <span>Configuración</span>
                    </Link>
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

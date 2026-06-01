import { createClient } from '@/lib/supabase/server'
import { MessageSquare, AlertTriangle, Globe2, Building } from 'lucide-react'
import { redirect } from 'next/navigation'
import { WhatsAppLogsTable } from '@/components/admin/whatsapp-logs-table'

export const dynamic = 'force-dynamic'

export default async function WhatsAppLogsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: userProfile } = await supabase
        .from('users')
        .select('role_id, institution_id, roles(name, permissions), institutions(name)')
        .eq('id', user.id)
        .single()

    const permissions = (userProfile?.roles as any)?.permissions || []
    const isSuperAdmin = (userProfile?.roles as any)?.name === 'Super Admin'
    const hasPermission = isSuperAdmin || permissions.includes('whatsapp_logs.view') || permissions.includes('*')

    if (!hasPermission) {
        return (
            <div className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-slate-800">Acceso Denegado</h1>
                <p className="text-slate-500 mt-2">No tienes permiso para ver los registros de WhatsApp.</p>
            </div>
        )
    }

    const institutionName = (userProfile?.institutions as any)?.name || ''

    let query = supabase
        .from('whatsapp_logs')
        .select('*, requests(radicado), appointments(appointment_date, appointment_time)')
        .order('created_at', { ascending: false })

    if (!isSuperAdmin && userProfile?.institution_id) {
        query = query.eq('institution_id', userProfile.institution_id)
    }

    const { data: logs, error } = await query

    if (error) {
        console.error('Error fetching logs:', error)
    }

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <MessageSquare className="w-8 h-8 text-green-600" />
                        Registros de WhatsApp
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Historial de notificaciones enviadas a pacientes vía WhatsApp.
                    </p>
                </div>

                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${isSuperAdmin ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-teal-50 border-teal-200 text-teal-700'}`}>
                    {isSuperAdmin
                        ? <><Globe2 className="w-4 h-4" /> Vista Global (Todas las IPS)</>
                        : <><Building className="w-4 h-4" /> {institutionName}</>}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <WhatsAppLogsTable initialData={logs || []} />
            </div>
        </div>
    )
}

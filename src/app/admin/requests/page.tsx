import { createClient } from '@/lib/supabase/server'
import { RequestsTable } from '@/components/admin/requests-table'
import { Inbox, Globe2, Building, Stethoscope } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
    const supabase = await createClient()

    // Auth & Role context
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
        .from('users')
        .select('role_id, institution_id, roles(name), institutions(name, slug)')
        .eq('id', user?.id ?? '')
        .single()

    const profile = userProfile as any;
    const isGlobal = profile?.roles?.name === 'Super Admin'
    const institutionName = (userProfile?.institutions as any)?.name || ''
    const institutionSlug = (userProfile?.institutions as any)?.slug || ''

    // Fetch requests with attachments and history for Gestor column
    const { data: requests, error } = await supabase
        .from('requests')
        .select(`
            *,
            canal,
            request_attachments(id),
            request_history(created_at, action, users(full_name))
        `)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching requests:', error)
    }

    const mappedRequests = requests || []

    const presencialUrl = institutionSlug
        ? `/portal/${institutionSlug}?canal=presencial`
        : null

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Inbox className="w-8 h-8 text-teal-600" />
                        Gestión de Solicitudes
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Bandeja de entrada, revisión y exportación de trámites médicos.
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                    {/* Botón atención presencial */}
                    {presencialUrl && !isGlobal && (
                        <a
                            href={presencialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-sm transition-colors"
                        >
                            <Stethoscope className="w-4 h-4" />
                            Registrar Atención Presencial
                        </a>
                    )}

                    {/* Context badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${isGlobal ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-teal-50 border-teal-200 text-teal-700'}`}>
                        {isGlobal
                            ? <><Globe2 className="w-4 h-4" /> Vista Global (Todas las IPS)</>
                            : <><Building className="w-4 h-4" /> {institutionName}</>}
                    </div>
                </div>
            </div>

            {/* Table + Toolbar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <RequestsTable initialData={mappedRequests} />
            </div>
        </div>
    )
}

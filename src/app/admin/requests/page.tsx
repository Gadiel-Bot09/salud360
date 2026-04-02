import { createClient } from '@/lib/supabase/server'
import { RequestsTable } from '@/components/admin/requests-table'

export default async function RequestsPage() {
    const supabase = await createClient()

    // Fetch all requests
    const { data: requests, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching requests:', error)
    }

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Gestión de Solicitudes</h2>
                    <p className="text-slate-500 mt-2">Bandeja de entrada y revisión de trámites.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
                <RequestsTable initialData={requests || []} />
            </div>
        </div>
    )
}

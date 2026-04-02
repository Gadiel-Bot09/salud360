import { fetchDashboardMetrics } from './actions'
import { DashboardCharts } from '@/components/admin/dashboard-charts'
import { AlertTriangle, Globe2, Building } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const metrics = await fetchDashboardMetrics()
    
    // Fetch user profile to detect Context (Global vs Single-Institution)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase.from('users').select('role, institutions(name)').eq('id', user?.id).single()

    const isGlobal = userProfile?.role === 'Super Admin'
    // Safe typing since we did a join `institutions(name)`
    const institutionName = (userProfile?.institutions as any)?.name || 'Red Desconocida'

    if (!metrics) {
        return (
            <div className="p-8 flex flex-col items-center justify-center text-center mt-20">
               <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
               <h2 className="text-2xl font-bold text-slate-800">Error de Conexión Analítica</h2>
               <p className="text-slate-500 max-w-md mt-2">
                   No se pudieron obtener las métricas de backend. Revise los permisos RLS.
               </p>
            </div>
        )
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Panel Integral</h2>
                    <p className="text-slate-500 mt-2 text-lg">
                        Rendimiento general y reportes de volumen de radicación.
                    </p>
                </div>

                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${isGlobal ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-teal-50 border-teal-200 text-teal-700'}`}>
                    {isGlobal ? (
                        <><Globe2 className="w-4 h-4" /> Viendo Red Global (Todas las IPS)</>
                    ) : (
                        <><Building className="w-4 h-4" /> Entidad: {institutionName}</>
                    )}
                </div>
            </div>

            <DashboardCharts metrics={metrics} />
            
        </div>
    )
}

import { fetchDashboardMetrics } from './actions'
import { DashboardCharts } from '@/components/admin/dashboard-charts'
import { AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const metrics = await fetchDashboardMetrics()

    if (!metrics) {
        return (
            <div className="p-8 flex flex-col items-center justify-center text-center mt-20">
               <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
               <h2 className="text-2xl font-bold text-slate-800">Error de Conexión Analítica</h2>
               <p className="text-slate-500 max-w-md mt-2">
                   No se pudieron obtener las métricas desde la base de datos central. Revise su conexión y los permisos de sesión.
               </p>
            </div>
        )
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Panel Integrado</h2>
                <p className="text-slate-500 mt-2 text-lg">
                    Rendimiento general y reportes de volumen de radicación a nivel institucional.
                </p>
            </div>

            <DashboardCharts metrics={metrics} />
            
        </div>
    )
}

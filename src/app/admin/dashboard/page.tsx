import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { Activity, Clock, CheckCircle, FileText } from 'lucide-react'

export default async function DashboardPage() {
    const supabase = await createClient()

    // For MVP, we will run some basic counts.
    // We use `count: 'exact'` to get the numbers efficiently.

    const [{ count: total }, { count: pending }, { count: closed }] = await Promise.all([
        supabase.from('requests').select('*', { count: 'exact', head: true }),
        supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'received'),
        supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
    ])

    return (
        <div className="p-8 space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Panel Principal</h2>
                <p className="text-slate-500 mt-2">Visión general de las solicitudes médicas y tiempos de respuesta.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Solicitudes</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{total || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">Este mes</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">En Trámite</CardTitle>
                        <Activity className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{pending || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">Requieren atención</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Resueltas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{closed || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">Últimos 30 días</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Tiempo Prom. Respuesta</CardTitle>
                        <Clock className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">4.2 <span className="text-xl">hrs</span></div>
                        <p className="text-xs text-slate-500 mt-1">Promedio general</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Solicitudes Recientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-slate-500 py-4 text-center">
                            (A continuación irá la tabla de últimas solicitudes radicadas)
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Tendencia por Especialidad</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-slate-500 py-4 text-center">
                            (Gráfico de volúmenes de solicitudes)
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

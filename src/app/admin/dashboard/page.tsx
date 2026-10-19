import { fetchDashboardMetrics } from './actions'
import { DashboardCharts } from '@/components/admin/dashboard-charts'
import { AlertTriangle, Globe2, Building, Stethoscope, Sunrise, Sun, Moon, Ghost, Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTimeGreeting } from '@/lib/utils'
import { getSeasonalConfig } from '@/lib/seasonal-theme'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const metrics = await fetchDashboardMetrics()
    
    // Fetch user profile to detect Context (Global vs Single-Institution)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
        .from('users')
        .select('full_name, role_id, roles(name), institutions(name, slug, settings_json)')
        .eq('id', user?.id)
        .single()

    const profile = userProfile as any;
    const isGlobal = profile?.roles?.name === 'Super Admin'
    const institutionName = (userProfile?.institutions as any)?.name || 'Red Desconocida'
    const institutionSlug = (userProfile?.institutions as any)?.slug || ''
    const presencialUrl = institutionSlug ? `/portal/${institutionSlug}?canal=presencial` : null

    const greeting = getTimeGreeting(
        profile?.full_name || (user?.user_metadata as any)?.full_name || null,
        user?.email
    )

    // Seasonal Theme resolution
    const seasonalSetting = (userProfile?.institutions as any)?.settings_json?.seasonal_theme || 'auto'
    const seasonal = getSeasonalConfig(seasonalSetting)

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

    // Determine card background and styles based on seasonal theme
    const isHalloween = seasonal.activeTheme === 'halloween'
    const isChristmas = seasonal.activeTheme === 'christmas'

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
            {/* Header con Saludo Personalizado y Toque de Temporada (Halloween/Navidad) */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-2xl border shadow-sm transition-all duration-300 relative overflow-hidden ${
                isHalloween
                    ? 'bg-gradient-to-r from-orange-50/60 via-white to-amber-50/40 border-orange-200/80'
                    : isChristmas
                    ? 'bg-gradient-to-r from-emerald-50/60 via-white to-red-50/30 border-emerald-200/80'
                    : 'bg-white border-slate-200/80'
            }`}>
                <div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2 ${
                        isHalloween
                            ? 'bg-orange-500/15 text-orange-700 border border-orange-500/30'
                            : isChristmas
                            ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                            : 'bg-teal-50 text-teal-800 border border-teal-200/60'
                    }`}>
                        {isHalloween ? (
                            <span>🎃</span>
                        ) : isChristmas ? (
                            <span>🎄</span>
                        ) : (
                            <>
                                {greeting.period === 'morning' && <Sunrise className="w-3.5 h-3.5 text-amber-500" />}
                                {greeting.period === 'afternoon' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
                                {greeting.period === 'night' && <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                            </>
                        )}
                        <span>{isHalloween ? seasonal.badgeText : isChristmas ? seasonal.badgeText : greeting.greeting}</span>
                        {greeting.formattedDate && (
                            <>
                                <span className={isHalloween ? 'text-orange-400' : isChristmas ? 'text-emerald-400' : 'text-teal-400'}>•</span>
                                <span>{greeting.formattedDate}</span>
                            </>
                        )}
                    </div>

                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <span>{greeting.fullPhrase}</span>
                        <span className="text-2xl" role="img" aria-hidden="true">
                            {isHalloween ? '🎃' : isChristmas ? '🎄' : greeting.emoji}
                        </span>
                    </h2>
                    <p className={`mt-1 text-sm md:text-base ${isHalloween || isChristmas ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                        {isHalloween || isChristmas ? seasonal.holidayMessage[greeting.period] : greeting.timeMessage}
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                    {/* Botón atención presencial */}
                    {presencialUrl && !isGlobal && (
                        <a
                            href={presencialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-sm transition-colors"
                        >
                            <Stethoscope className="w-4 h-4" />
                            Registrar Atención Presencial
                        </a>
                    )}

                    <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${isGlobal ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-teal-50 border-teal-200 text-teal-700'}`}>
                        {isGlobal ? (
                            <><Globe2 className="w-4 h-4" /> Red Global (Todas las IPS)</>
                        ) : (
                            <><Building className="w-4 h-4" /> Entidad: {institutionName}</>
                        )}
                    </div>
                </div>
            </div>

            <DashboardCharts metrics={metrics} />
            
        </div>
    )
}

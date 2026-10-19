'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { updateSeasonalTheme } from '@/app/admin/settings/actions'
import { resolveActiveTheme, SeasonalThemeSetting } from '@/lib/seasonal-theme'
import { Sparkles, Check, Calendar, Ghost, Gift, Ban, Loader2 } from 'lucide-react'

interface Props {
  institutionId: string
  initialSetting?: SeasonalThemeSetting
}

export function SeasonalThemeManager({ institutionId, initialSetting = 'auto' }: Props) {
  const [setting, setSetting] = useState<SeasonalThemeSetting>(initialSetting)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  const currentActive = resolveActiveTheme(setting)

  const options: {
    id: SeasonalThemeSetting
    title: string
    badge: string
    description: string
    icon: any
    color: string
    activeBorder: string
    activeBg: string
  }[] = [
    {
      id: 'auto',
      title: 'Automático (Recomendado)',
      badge: 'Calendario inteligente',
      description: 'Activa Halloween del 1 al 31 de Octubre y Navidad en Diciembre. El resto del año mantiene la vista estándar.',
      icon: Calendar,
      color: 'text-teal-600',
      activeBorder: 'border-teal-500 ring-2 ring-teal-500/20',
      activeBg: 'bg-teal-50/50'
    },
    {
      id: 'halloween',
      title: 'Forzar Halloween 🎃',
      badge: 'Hasta el 31 de Octubre',
      description: 'Muestra murciélagos sutiles, calabacita festiva en el logo, saludos temáticos y acentos ámbar de octubre.',
      icon: Ghost,
      color: 'text-orange-500',
      activeBorder: 'border-orange-500 ring-2 ring-orange-500/20',
      activeBg: 'bg-orange-50/50'
    },
    {
      id: 'christmas',
      title: 'Forzar Navidad 🎄',
      badge: 'Fiestas Decembrinas',
      description: 'Muestra copos sutiles de nieve, gorro navideño en el logo y saludos de paz y prosperidad de fin de año.',
      icon: Gift,
      color: 'text-emerald-600',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
      activeBg: 'bg-emerald-50/50'
    },
    {
      id: 'disabled',
      title: 'Desactivado (Estándar)',
      badge: 'Sin decoraciones',
      description: 'Desactiva cualquier elemento festivo, manteniendo el diseño corporativo limpio de Salud360 todo el año.',
      icon: Ban,
      color: 'text-slate-400',
      activeBorder: 'border-slate-500 ring-2 ring-slate-500/20',
      activeBg: 'bg-slate-50'
    }
  ]

  const handleSelect = (newSetting: SeasonalThemeSetting) => {
    setSetting(newSetting)
    startTransition(async () => {
      const res = await updateSeasonalTheme(institutionId, newSetting)
      if (res.success) {
        toast({
          title: 'Tema de Temporada Actualizado',
          description: `Se ha establecido la configuración en: ${newSetting === 'auto' ? 'Automático por Calendario' : newSetting.toUpperCase()}`,
        })
      } else {
        toast({
          title: 'Error al actualizar',
          description: res.error,
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Temas Festivos de Temporada (Halloween &amp; Navidad)
            </h3>
            {pending && <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Personaliza el ambiente de tu plataforma durante las festividades para una experiencia cercana y moderna con tu equipo.
          </p>
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 border border-slate-200">
          <span className="text-slate-500">Estado visible hoy:</span>
          {currentActive === 'halloween' && (
            <span className="text-orange-600 font-bold flex items-center gap-1">
              🎃 Halloween Activo
            </span>
          )}
          {currentActive === 'christmas' && (
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              🎄 Navidad Activa
            </span>
          )}
          {currentActive === 'none' && (
            <span className="text-slate-600 font-bold flex items-center gap-1">
              Modo Estándar
            </span>
          )}
        </div>
      </div>

      {/* Grid of options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((opt) => {
          const Icon = opt.icon
          const isSelected = setting === opt.id

          return (
            <div
              key={opt.id}
              onClick={() => !pending && handleSelect(opt.id)}
              className={`relative cursor-pointer rounded-xl border p-4.5 transition-all duration-200 hover:shadow-md ${
                isSelected
                  ? `${opt.activeBorder} ${opt.activeBg}`
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0 ${opt.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      {opt.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

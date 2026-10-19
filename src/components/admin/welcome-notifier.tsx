'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { getTimeGreeting } from '@/lib/utils'
import { Sunrise, Sun, Moon, CheckCircle2 } from 'lucide-react'

interface WelcomeNotifierProps {
  fullName?: string | null
  email?: string | null
  seasonalTheme?: 'halloween' | 'christmas' | 'none'
}

function WelcomeNotifierContent({ fullName, email, seasonalTheme = 'none' }: WelcomeNotifierProps) {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const isWelcome = searchParams.get('welcome')
    if (isWelcome === '1' || isWelcome === 'true') {
      const greeting = getTimeGreeting(fullName, email)

      // Clean the query parameter without causing a re-render or page reload
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('welcome')
        const newUrl = url.pathname + (url.search ? url.search : '') + url.hash
        window.history.replaceState({}, '', newUrl)
      } catch (e) {
        // Fallback: ignore if history API fails
      }

      // Customize greeting if seasonal theme is active
      let emoji = greeting.emoji
      let message = greeting.timeMessage
      let toastBorder = "border-l-teal-600"

      if (seasonalTheme === 'halloween') {
        emoji = '🎃'
        message = greeting.period === 'morning'
          ? '¡Que tengas una jornada terroríficamente productiva!'
          : greeting.period === 'afternoon'
          ? '¡Que tu tarde esté llena de energía y dulces resultados!'
          : '¡Gracias por tu gran dedicación en el turno de esta noche!'
        toastBorder = "border-l-orange-500"
      } else if (seasonalTheme === 'christmas') {
        emoji = '🎄'
        message = '¡Felices Fiestas y que tengas una excelente jornada médica en Salud360!'
        toastBorder = "border-l-emerald-600"
      }

      // Display the personalized welcome toast
      toast({
        title: (
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
            <span className="text-xl" role="img" aria-label={greeting.greeting}>
              {emoji}
            </span>
            <span>{greeting.phrase}</span>
          </div>
        ) as any,
        description: (
          <div className="space-y-1 mt-1 text-slate-600 text-sm">
            <p>{message}</p>
            <div className="flex items-center gap-1.5 text-xs text-teal-700 font-medium pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Sesión iniciada con éxito en Salud360</span>
            </div>
          </div>
        ) as any,
        className: `bg-white border-l-4 ${toastBorder} shadow-xl border-slate-200`,
      })
    }
  }, [searchParams, fullName, email, seasonalTheme, toast])

  return null
}

export function WelcomeNotifier(props: WelcomeNotifierProps) {
  return (
    <Suspense fallback={null}>
      <WelcomeNotifierContent {...props} />
    </Suspense>
  )
}

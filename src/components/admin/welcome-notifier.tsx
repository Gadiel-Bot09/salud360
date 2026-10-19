'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { getTimeGreeting } from '@/lib/utils'
import { Sunrise, Sun, Moon, CheckCircle2 } from 'lucide-react'

interface WelcomeNotifierProps {
  fullName?: string | null
  email?: string | null
}

function WelcomeNotifierContent({ fullName, email }: WelcomeNotifierProps) {
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

      // Display the personalized welcome toast
      toast({
        title: (
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
            <span className="text-xl" role="img" aria-label={greeting.greeting}>
              {greeting.emoji}
            </span>
            <span>{greeting.phrase}</span>
          </div>
        ) as any,
        description: (
          <div className="space-y-1 mt-1 text-slate-600 text-sm">
            <p>{greeting.timeMessage}</p>
            <div className="flex items-center gap-1.5 text-xs text-teal-700 font-medium pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Sesión iniciada con éxito en Salud360</span>
            </div>
          </div>
        ) as any,
        className: "bg-white border-l-4 border-l-teal-600 shadow-xl border-slate-200",
      })
    }
  }, [searchParams, fullName, email, toast])

  return null
}

export function WelcomeNotifier(props: WelcomeNotifierProps) {
  return (
    <Suspense fallback={null}>
      <WelcomeNotifierContent {...props} />
    </Suspense>
  )
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"
import { es } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Colombia timezone — UTC-5, no DST ever */
export const TZ_CO = 'America/Bogota'

/**
 * formatCO — format any date as Colombia local time.
 * Used throughout the UI for display.
 */
export function formatCO(date: Date | string | number, formatStr: string) {
  return formatInTimeZone(date, TZ_CO, formatStr, { locale: es })
}

/**
 * nowCO — returns the current moment as a Date object
 * adjusted to Colombia time (UTC-5).
 *
 * IMPORTANT: JavaScript Date objects are always UTC internally.
 * toZonedTime shifts the internal value so that .getFullYear(),
 * .getMonth(), .getDate(), .getHours() etc. return Colombia values
 * when you read them. Use this instead of `new Date()` whenever
 * you need the current date/time in Colombia.
 */
export function nowCO(): Date {
  return toZonedTime(new Date(), TZ_CO)
}

/**
 * todayCO — returns "YYYY-MM-DD" for today in Colombia.
 * Safe to use for DB date comparisons at any server location.
 *
 * Why: at midnight Colombia (00:00 COT = 05:00 UTC), `new Date().toISOString()`
 * already returns the NEXT day. This returns the correct Colombia date.
 */
export function todayCO(): string {
  return formatInTimeZone(new Date(), TZ_CO, 'yyyy-MM-dd')
}

/**
 * nowCOIso — returns the current Colombia time as an ISO-8601 string
 * with the -05:00 offset. Suitable for storing timestamps that represent
 * Colombia local time in a human-readable way.
 *
 * Example: "2026-07-23T14:35:00-05:00"
 */
export function nowCOIso(): string {
  return formatInTimeZone(new Date(), TZ_CO, "yyyy-MM-dd'T'HH:mm:ssxxx")
}

/**
 * nowCOForDb — returns an ISO string in UTC that is safe to store in Supabase
 * (Supabase uses timestamptz, which stores UTC).
 * This is just `new Date().toISOString()` — kept for clarity.
 * The DB will store UTC; use formatCO() to display it.
 */
export function nowCOForDb(): string {
  return new Date().toISOString() // UTC — Supabase converts correctly
}

export type TimePeriod = 'morning' | 'afternoon' | 'night'

export interface GreetingInfo {
  greeting: string       // "Buenos días" | "Buenas tardes" | "Buenas noches"
  phrase: string         // "¡Buenos días, Madeley!"
  fullPhrase: string     // "¡Buenos días, Madeley Vanegas!"
  firstName: string      // "Madeley"
  fullName: string       // "Madeley Vanegas"
  period: TimePeriod     // 'morning' | 'afternoon' | 'night'
  emoji: string          // "🌅" | "☀️" | "🌙"
  timeMessage: string    // "Que tengas una excelente y productiva mañana."
  formattedDate: string  // "Lunes, 19 de octubre de 2026"
}

export function resolveDisplayName(fullName?: string | null, email?: string | null): { firstName: string; fullName: string } {
  if (fullName && fullName.trim()) {
    const trimmed = fullName.trim()
    const parts = trimmed.split(/\s+/)
    return {
      firstName: parts[0],
      fullName: trimmed
    }
  }

  if (email && email.trim()) {
    const local = email.split('@')[0]
    const clean = local.replace(/[._\d]+/g, ' ').trim()
    const capitalized = clean
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
    const parts = capitalized.split(/\s+/)
    return {
      firstName: parts[0] || 'Usuario',
      fullName: capitalized || 'Usuario'
    }
  }

  return {
    firstName: 'Usuario',
    fullName: 'Usuario'
  }
}

/**
 * getTimeGreeting — returns greeting based on Colombia time (UTC-5)
 * Mañana: 05:00 a 11:59 ("Buenos días")
 * Tarde:  12:00 a 18:59 ("Buenas tardes")
 * Noche:  19:00 a 04:59 ("Buenas noches")
 */
export function getTimeGreeting(fullName?: string | null, email?: string | null): GreetingInfo {
  const hour = nowCO().getHours()
  const names = resolveDisplayName(fullName, email)

  let greeting = 'Buenos días'
  let period: TimePeriod = 'morning'
  let emoji = '🌅'
  let timeMessage = 'Que tengas una excelente y productiva mañana.'

  if (hour >= 5 && hour < 12) {
    greeting = 'Buenos días'
    period = 'morning'
    emoji = '🌅'
    timeMessage = 'Que tengas una excelente y productiva mañana.'
  } else if (hour >= 12 && hour < 19) {
    greeting = 'Buenas tardes'
    period = 'afternoon'
    emoji = '☀️'
    timeMessage = 'Esperamos que tu jornada de la tarde sea muy exitosa.'
  } else {
    greeting = 'Buenas noches'
    period = 'night'
    emoji = '🌙'
    timeMessage = 'Gracias por tu dedicación y compromiso en la jornada de hoy.'
  }

  const phrase = names.firstName ? `¡${greeting}, ${names.firstName}!` : `¡${greeting}!`
  const fullPhrase = names.fullName ? `¡${greeting}, ${names.fullName}!` : `¡${greeting}!`
  
  let formattedDate = ''
  try {
    const rawDate = formatCO(new Date(), "EEEE, d 'de' MMMM 'de' yyyy")
    formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1)
  } catch {
    formattedDate = ''
  }

  return {
    greeting,
    phrase,
    fullPhrase,
    firstName: names.firstName,
    fullName: names.fullName,
    period,
    emoji,
    timeMessage,
    formattedDate
  }
}

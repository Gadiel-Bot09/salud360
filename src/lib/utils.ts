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

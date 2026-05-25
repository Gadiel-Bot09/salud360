import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatInTimeZone } from "date-fns-tz"
import { es } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCO(date: Date | string | number, formatStr: string) {
  return formatInTimeZone(date, 'America/Bogota', formatStr, { locale: es })
}

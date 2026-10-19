import { nowCO } from '@/lib/utils'

export type SeasonalThemeSetting = 'auto' | 'halloween' | 'christmas' | 'disabled'
export type ActiveSeasonalTheme = 'halloween' | 'christmas' | 'none'

export interface SeasonalThemeConfig {
  activeTheme: ActiveSeasonalTheme
  setting: SeasonalThemeSetting
  label: string
  emoji: string
  badgeText: string
  badgeClass: string
  borderClass: string
  glowClass: string
  accentGradient: string
  holidayMessage: {
    morning: string
    afternoon: string
    night: string
  }
}

/**
 * resolveActiveTheme — Determines whether Halloween, Christmas, or None is active.
 * - 'disabled': Never active.
 * - 'halloween': Force Halloween.
 * - 'christmas': Force Christmas.
 * - 'auto':
 *     - Month 9 (October, 1st to 31st): Halloween 🎃
 *     - Month 11 (December, 1st to 31st) or Month 0 (January, 1st to 6th): Christmas 🎄
 *     - Otherwise: None
 */
export function resolveActiveTheme(
  setting: SeasonalThemeSetting = 'auto',
  date: Date = nowCO()
): ActiveSeasonalTheme {
  if (setting === 'disabled') return 'none'
  if (setting === 'halloween') return 'halloween'
  if (setting === 'christmas') return 'christmas'

  // Automatic calculation based on Colombia time
  const month = date.getMonth() // 0 = Jan, 9 = Oct, 11 = Dec
  const day = date.getDate()

  // October 1 - October 31
  if (month === 9) {
    return 'halloween'
  }

  // December 1 - January 6
  if (month === 11 || (month === 0 && day <= 6)) {
    return 'christmas'
  }

  return 'none'
}

/**
 * getSeasonalConfig — Returns rich UI styling and messages based on active theme
 */
export function getSeasonalConfig(
  setting: SeasonalThemeSetting = 'auto',
  date: Date = nowCO()
): SeasonalThemeConfig {
  const activeTheme = resolveActiveTheme(setting, date)

  if (activeTheme === 'halloween') {
    return {
      activeTheme: 'halloween',
      setting,
      label: 'Temporada Halloween',
      emoji: '🎃',
      badgeText: '🎃 Modo Halloween • Hasta el 31 de Octubre',
      badgeClass: 'bg-orange-500/15 border-orange-500/30 text-orange-700',
      borderClass: 'border-orange-500/30',
      glowClass: 'shadow-orange-500/10',
      accentGradient: 'from-orange-500 to-amber-500',
      holidayMessage: {
        morning: '¡Buenos días! 🎃 Que tengas una jornada terroríficamente productiva.',
        afternoon: '¡Buenas tardes! 🎃 Que tu tarde esté llena de energía y dulces resultados.',
        night: '¡Buenas noches! 👻 Gracias por tu dedicación en el turno de esta noche.'
      }
    }
  }

  if (activeTheme === 'christmas') {
    return {
      activeTheme: 'christmas',
      setting,
      label: 'Temporada Navideña',
      emoji: '🎄',
      badgeText: '🎄 Temporada Navideña • Felices Fiestas',
      badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700',
      borderClass: 'border-emerald-500/30',
      glowClass: 'shadow-emerald-500/10',
      accentGradient: 'from-emerald-600 to-red-500',
      holidayMessage: {
        morning: '¡Buenos días! 🎄 Que la paz y la alegría acompañen tu jornada médica.',
        afternoon: '¡Buenas tardes! 🎁 Esperamos que tu tarde sea muy exitosa y llena de bendiciones.',
        night: '¡Buenas noches! ✨ Gracias por tu vocación y entrega en estas fiestas.'
      }
    }
  }

  return {
    activeTheme: 'none',
    setting,
    label: 'Modo Estándar',
    emoji: '',
    badgeText: '',
    badgeClass: 'bg-teal-50 border-teal-200/60 text-teal-800',
    borderClass: 'border-slate-200/80',
    glowClass: 'shadow-sm',
    accentGradient: 'from-teal-600 to-teal-500',
    holidayMessage: {
      morning: 'Que tengas una excelente y productiva mañana.',
      afternoon: 'Esperamos que tu jornada de la tarde sea muy exitosa.',
      night: 'Gracias por tu dedicación y compromiso en la jornada de hoy.'
    }
  }
}

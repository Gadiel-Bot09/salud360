'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Inbox,
  CalendarDays,
  BarChart2,
  MessageSquare,
  Smartphone,
  FileEdit,
  FileText,
  Users,
  ShieldCheck,
  Building2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { UserMenu } from '@/components/admin/user-menu'
import type { ActiveSeasonalTheme } from '@/lib/seasonal-theme'

export interface SidebarPermissions {
  requestsView: boolean
  appointmentsView: boolean
  reportsView: boolean
  whatsappLogsView: boolean
  whatsappManage: boolean
  formsManage: boolean
  templatesManage: boolean
  usersManage: boolean
  rolesManage: boolean
  institutionsManage: boolean
  settingsManage: boolean
}

interface AdminSidebarProps {
  permissions: SidebarPermissions
  pendingAppointmentsCount: number
  seasonalTheme: ActiveSeasonalTheme
  institutionName?: string | null
  isSuperAdmin: boolean
  user: {
    email: string
    name: string | null
    roleName: string
  }
}

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  iconColor?: string
  badge?: number
  visible: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

export function AdminSidebar({
  permissions,
  pendingAppointmentsCount,
  seasonalTheme,
  institutionName,
  isSuperAdmin,
  user,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Restore saved collapse preference on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('salud360_sidebar_collapsed')
      if (saved === 'true') setCollapsed(true)
    } catch { /* ignore */ }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      try {
        window.localStorage.setItem('salud360_sidebar_collapsed', String(next))
      } catch { /* ignore */ }
      return next
    })
  }

  const groups: NavGroup[] = [
    {
      title: 'Principal',
      items: [
        {
          href: '/admin/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          iconColor: 'text-teal-400',
          visible: true,
        },
        {
          href: '/admin/requests',
          label: 'Solicitudes',
          icon: Inbox,
          iconColor: 'text-sky-400',
          visible: permissions.requestsView,
        },
        {
          href: '/admin/appointments',
          label: 'Citas',
          icon: CalendarDays,
          iconColor: 'text-teal-400',
          badge: pendingAppointmentsCount > 0 ? pendingAppointmentsCount : undefined,
          visible: permissions.appointmentsView,
        },
        {
          href: '/admin/reports',
          label: 'Reportes',
          icon: BarChart2,
          iconColor: 'text-emerald-400',
          visible: permissions.reportsView,
        },
      ],
    },
    {
      title: 'Comunicación',
      items: [
        {
          href: '/admin/whatsapp-logs',
          label: 'Logs WhatsApp',
          icon: MessageSquare,
          iconColor: 'text-green-400',
          visible: permissions.whatsappLogsView,
        },
        {
          href: '/admin/whatsapp-manager',
          label: 'Conexión WhatsApp',
          icon: Smartphone,
          iconColor: 'text-green-400',
          visible: permissions.whatsappManage,
        },
      ],
    },
    {
      title: 'Formularios y Docs',
      items: [
        {
          href: '/admin/forms',
          label: 'Formularios',
          icon: FileEdit,
          iconColor: 'text-amber-400',
          visible: permissions.formsManage,
        },
        {
          href: '/admin/templates',
          label: 'Plantillas Legales',
          icon: FileText,
          iconColor: 'text-indigo-400',
          visible: permissions.templatesManage,
        },
      ],
    },
    {
      title: 'Administración',
      items: [
        {
          href: '/admin/users',
          label: 'Usuarios',
          icon: Users,
          iconColor: 'text-slate-300',
          visible: permissions.usersManage,
        },
        {
          href: '/admin/roles',
          label: 'Roles',
          icon: ShieldCheck,
          iconColor: 'text-violet-400',
          visible: permissions.rolesManage,
        },
        {
          href: '/admin/institutions',
          label: 'Instituciones',
          icon: Building2,
          iconColor: 'text-cyan-400',
          visible: permissions.institutionsManage,
        },
        {
          href: '/admin/settings',
          label: 'Configuración',
          icon: Settings,
          iconColor: 'text-slate-300',
          visible: permissions.settingsManage,
        },
      ],
    },
  ]

  const visibleGroups = groups
    .map(g => ({ ...g, items: g.items.filter(i => i.visible) }))
    .filter(g => g.items.length > 0)

  const isRouteActive = (href: string) => {
    if (!pathname) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className={`relative flex-shrink-0 flex flex-col h-screen select-none bg-gradient-to-b from-[#090F1D] via-[#0E1629] to-[#090F1D] text-slate-300 border-r border-slate-800/80 transition-all duration-200 ease-in-out ${
        collapsed ? 'w-[74px]' : 'w-[258px]'
      }`}
    >
      {/* Subtle Ambient Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-teal-500/[0.08] to-transparent"
      />

      {/* Brand Header */}
      <div className={`relative z-10 flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'} pt-5 pb-3`}>
        {!collapsed ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex items-center shrink-0">
              <Image src="/logo-white.svg" alt="Salud360 Logo" width={128} height={32} priority />
              {seasonalTheme === 'halloween' && (
                <span
                  title="¡Modo Halloween Activo!"
                  className="absolute -top-3 left-[92px] text-sm select-none filter drop-shadow transition-transform hover:scale-125"
                >
                  🎃
                </span>
              )}
              {seasonalTheme === 'christmas' && (
                <span
                  title="¡Modo Navideño Activo!"
                  className="absolute -top-3 left-[92px] text-sm select-none filter drop-shadow transition-transform hover:scale-125"
                >
                  🎅
                </span>
              )}
            </div>
            {seasonalTheme === 'halloween' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 shrink-0">
                🎃
              </span>
            )}
            {seasonalTheme === 'christmas' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                🎄
              </span>
            )}
          </div>
        ) : (
          <Link
            href="/admin/dashboard"
            title="Salud360"
            className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 font-black text-base shadow-inner hover:bg-teal-500/25 transition-colors"
          >
            S+
          </Link>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.07] transition-colors ${
            collapsed ? 'absolute -right-3 top-6 bg-[#0E1629] border border-slate-700/80 shadow-md z-20 rounded-full p-1' : ''
          }`}
        >
          {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Institutional Context Pill */}
      {!collapsed && (
        <div className="relative z-10 px-4 pb-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" />
            <span className="text-[11px] font-medium text-slate-300 truncate" title={institutionName || 'Red Global Salud360'}>
              {isSuperAdmin ? 'Vista Global · Todas las IPS' : institutionName || 'Institución Activa'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Groups (Ultra-thin dark scrollbar) */}
      <nav className="relative z-10 flex-1 w-full overflow-y-auto sidebar-scroll px-3 py-1 space-y-4">
        {visibleGroups.map((group, gIdx) => (
          <div key={group.title} className="space-y-1">
            {!collapsed ? (
              <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {group.title}
              </p>
            ) : (
              gIdx > 0 && <div className="mx-3 my-2 border-t border-slate-800/80" />
            )}

            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon
                const active = isRouteActive(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                    className={`group relative flex items-center ${
                      collapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2'
                    } rounded-xl text-[13px] font-medium transition-all duration-150 border ${
                      active
                        ? 'bg-gradient-to-r from-teal-500/20 via-teal-500/10 to-transparent text-white border-teal-500/25 shadow-sm'
                        : 'text-slate-400 border-transparent hover:text-slate-100 hover:bg-white/[0.05]'
                    }`}
                  >
                    {/* Glowing Active Left Accent Pill */}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-teal-400 rounded-r-full shadow-[0_0_8px_rgba(45,212,191,0.85)]"
                      />
                    )}

                    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                          active
                            ? 'text-teal-300'
                            : item.iconColor
                            ? `${item.iconColor} opacity-80 group-hover:opacity-100`
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {/* Pending Badge */}
                    {item.badge !== undefined && !collapsed && (
                      <span className="ml-2 bg-rose-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shadow-sm shadow-rose-950/60">
                        {item.badge}
                      </span>
                    )}
                    {item.badge !== undefined && collapsed && (
                      <span className="absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#0E1629]" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Compact User Footer */}
      <UserMenu
        email={user.email}
        name={user.name}
        roleName={user.roleName}
        collapsed={collapsed}
      />
    </aside>
  )
}

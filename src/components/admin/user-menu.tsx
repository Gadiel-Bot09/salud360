'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, KeyRound } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { changePassword } from '@/app/admin/settings/actions'
import { logout } from '@/app/login/actions'

function getInitials(name?: string | null, email?: string) {
  const source = (name || email || 'U').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function UserMenu({
  email,
  name,
  roleName,
  collapsed = false,
}: {
  email: string
  name?: string | null
  roleName?: string | null
  collapsed?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const initials = getInitials(name, email)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await changePassword(fd)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Éxito', description: result.message })
        setOpen(false)
      }
    })
  }

  return (
    <div className="w-full shrink-0 border-t border-slate-800/80 bg-[#070C18]/70 backdrop-blur-sm">
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 py-3 px-2">
          <div
            title={`${name || email}${roleName ? ` · ${roleName}` : ''}`}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-teal-900/40 ring-1 ring-teal-400/30 select-none"
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="Cambiar contraseña"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <KeyRound className="h-4 w-4" />
          </button>
          <form action={logout}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {/* Compact Profile Card */}
          <div className="rounded-xl bg-slate-800/45 border border-slate-700/50 p-2.5 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md shadow-teal-950/50 ring-1 ring-teal-400/30 select-none">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold text-white truncate leading-tight">
                  {name || email}
                </p>
              </div>
              {name && (
                <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5" title={email}>
                  {email}
                </p>
              )}
              {roleName && (
                <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/25 leading-none">
                  {roleName}
                </span>
              )}
            </div>
          </div>

          {/* Sleek Side-by-Side Quick Actions */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center justify-center gap-1.5 h-8 px-2 rounded-lg text-[11px] font-semibold text-slate-300 bg-slate-800/50 hover:bg-slate-700/70 hover:text-white border border-slate-700/50 transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5 text-slate-400" />
              <span>Clave</span>
            </button>
            <form action={logout} className="w-full">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 h-8 px-2 rounded-lg text-[11px] font-semibold text-slate-300 bg-slate-800/50 hover:bg-rose-500/15 hover:text-rose-300 border border-slate-700/50 hover:border-rose-500/30 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400/80" />
                <span>Salir</span>
              </button>
            </form>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl">Cambiar Contraseña</DialogTitle>
              <DialogDescription>
                Ingresa y confirma tu nueva contraseña. No la compartas con nadie.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-6">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Repite la nueva contraseña"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="bg-teal-600 hover:bg-teal-700">
                {isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

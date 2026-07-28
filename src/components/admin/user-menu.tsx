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

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

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
    <div className="w-full px-4 mt-auto">
      <div className="bg-slate-800 rounded-lg p-3 mb-2 flex flex-col gap-2 shadow-inner border border-slate-700">
        <p className="text-xs font-medium text-slate-300 truncate px-2 pt-1">{email}</p>
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700/50 h-8 rounded-md transition-colors"
          onClick={() => setOpen(true)}
        >
          <KeyRound className="mr-2 h-3.5 w-3.5" />
          Cambiar contraseña
        </Button>
      </div>
      <form action={logout}>
        <Button variant="ghost" className="w-full justify-start font-bold text-slate-400 hover:text-red-400 hover:bg-slate-800/50 h-10 transition-colors">
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </form>

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

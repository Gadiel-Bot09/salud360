'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Loader2, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { updateUserName } from './actions'

interface EditNameModalProps {
  userId: string
  currentName: string
}

export function EditNameModal({ userId, currentName }: EditNameModalProps) {
  const [open, setOpen]         = useState(false)
  const [name, setName]         = useState(currentName)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await updateUserName(userId, name)
      if (res.success) {
        toast({ title: '✅ Nombre actualizado correctamente' })
        setOpen(false)
      } else {
        toast({ title: 'Error al actualizar', description: res.error, variant: 'destructive' })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Editar nombre"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-teal-600"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" />
            Editar Nombre de Usuario
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-2">
          El nombre completo se usa en reportes, auditoría y comunicaciones del sistema.
        </p>
        <form onSubmit={handleUpdate} className="space-y-4 mt-1">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre Completo</Label>
            <Input
              id="edit-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: María González López"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={pending}>
              {pending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

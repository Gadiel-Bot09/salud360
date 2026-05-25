'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { updateUserEmail } from './actions'

interface EditEmailModalProps {
  userId: string
  currentEmail: string
}

export function EditEmailModal({ userId, currentEmail }: EditEmailModalProps) {
  const [open, setOpen] = useState(false)
  const [newEmail, setNewEmail] = useState(currentEmail)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || newEmail === currentEmail) return

    startTransition(async () => {
      const res = await updateUserEmail(userId, newEmail)
      if (res.success) {
        toast({ title: 'Correo actualizado exitosamente' })
        setOpen(false)
      } else {
        toast({ title: 'Error al actualizar', description: res.error, variant: 'destructive' })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-600">
          <Edit2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Correo</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Actualizar Correo Electrónico</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdate} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Nuevo Correo</Label>
            <Input 
              type="email" 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
              required 
              placeholder="ejemplo@correo.com"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={pending}>
              {pending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

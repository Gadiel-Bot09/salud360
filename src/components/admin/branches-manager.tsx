'use client'

import { useState, useTransition } from 'react'
import { MapPin, Phone, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import type { Branch } from '@/app/admin/requests/branches-actions'
import {
  createBranch,
  updateBranch,
  toggleBranchActive,
  deleteBranch,
} from '@/app/admin/requests/branches-actions'

interface Props {
  initialBranches: Branch[]
}

const emptyForm = { name: '', address: '', phone: '' }

export function BranchesManager({ initialBranches }: Props) {
  const { toast } = useToast()
  const [isPending, start] = useTransition()
  const [branches, setBranches] = useState<Branch[]>(initialBranches)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTarget, setEditTarget]   = useState<Branch | null>(null)
  const [form, setForm]               = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null)

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (branch: Branch) => {
    setEditTarget(branch)
    setForm({ name: branch.name, address: branch.address, phone: branch.phone || '' })
    setIsModalOpen(true)
  }

  const handleSave = () => {
    const fd = new FormData()
    fd.set('name', form.name)
    fd.set('address', form.address)
    fd.set('phone', form.phone)
    if (editTarget) fd.set('id', editTarget.id)

    start(async () => {
      const res = editTarget ? await updateBranch(fd) : await createBranch(fd)
      if ('error' in res && res.error) {
        toast({ title: 'Error', description: res.error, variant: 'destructive' })
        return
      }
      toast({ title: editTarget ? 'Sede actualizada ✓' : 'Sede creada ✓', description: `"${form.name}" guardada correctamente.` })
      setIsModalOpen(false)
      // Optimistic update
      if (editTarget) {
        setBranches(prev => prev.map(b => b.id === editTarget.id
          ? { ...b, name: form.name, address: form.address, phone: form.phone || null }
          : b
        ))
      } else {
        // Reload via server happens on next navigation; just add a temp entry
        setBranches(prev => [...prev, {
          id: crypto.randomUUID(),
          institution_id: '',
          name: form.name,
          address: form.address,
          phone: form.phone || null,
          active: true,
          created_at: new Date().toISOString()
        }])
      }
    })
  }

  const handleToggle = (branch: Branch) => {
    start(async () => {
      const res = await toggleBranchActive(branch.id, !branch.active)
      if ('error' in res && res.error) {
        toast({ title: 'Error', description: res.error, variant: 'destructive' })
        return
      }
      setBranches(prev => prev.map(b => b.id === branch.id ? { ...b, active: !b.active } : b))
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    start(async () => {
      const res = await deleteBranch(deleteTarget.id)
      if ('error' in res && res.error) {
        toast({ title: 'Error', description: res.error, variant: 'destructive' })
        setDeleteTarget(null)
        return
      }
      toast({ title: 'Sede eliminada', description: `"${deleteTarget.name}" fue eliminada.` })
      setBranches(prev => prev.filter(b => b.id !== deleteTarget.id))
      setDeleteTarget(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {branches.length === 0
              ? 'Aún no hay sedes registradas.'
              : `${branches.filter(b => b.active).length} activa(s) · ${branches.length} total`}
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-teal-700 hover:bg-teal-800 gap-2">
          <Plus className="w-4 h-4" /> Nueva Sede
        </Button>
      </div>

      {/* Branch list */}
      {branches.length > 0 && (
        <div className="space-y-2">
          {branches.map(branch => (
            <div
              key={branch.id}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                branch.active
                  ? 'bg-white border-slate-200 hover:border-teal-200'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${branch.active ? 'bg-teal-100' : 'bg-slate-100'}`}>
                <Building2 className={`w-4 h-4 ${branch.active ? 'text-teal-700' : 'text-slate-400'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${branch.active ? 'text-slate-800' : 'text-slate-500'}`}>
                  {branch.name}
                  {!branch.active && <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 rounded-full px-2 py-0.5">Inactiva</span>}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" /> {branch.address}
                  </span>
                  {branch.phone && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Phone className="w-3 h-3" /> {branch.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggle(branch)}
                  disabled={isPending}
                  title={branch.active ? 'Desactivar sede' : 'Activar sede'}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                >
                  {branch.active
                    ? <ToggleRight className="w-5 h-5 text-teal-600" />
                    : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => openEdit(branch)}
                  disabled={isPending}
                  title="Editar sede"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(branch)}
                  disabled={isPending}
                  title="Eliminar sede"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={val => !val && setIsModalOpen(false)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Building2 className="w-5 h-5 text-teal-600" />
              {editTarget ? 'Editar Sede' : 'Nueva Sede'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              {editTarget ? 'Actualiza los datos de esta sede.' : 'Complete los datos de la nueva sede o sucursal.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nombre de la Sede <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Sede Centro, Sucursal Norte..."
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Dirección <span className="text-red-500">*</span></Label>
              <Input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Ej: Calle 45 #12-34, Bogotá"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Teléfono <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Ej: 6013456789"
                className="border-slate-200"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isPending}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !form.name.trim() || !form.address.trim()}
              className="bg-teal-700 hover:bg-teal-800"
            >
              <Check className="w-4 h-4 mr-1" />
              {isPending ? 'Guardando...' : editTarget ? 'Actualizar' : 'Crear Sede'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={val => !val && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" /> Eliminar Sede
            </DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar la sede <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>?
              Las citas ya asignadas a esta sede conservarán el nombre registrado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleDelete} disabled={isPending} className="bg-red-700 hover:bg-red-800 text-white">
              {isPending ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

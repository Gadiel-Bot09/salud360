'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Plus, Trash2, Loader2, Stethoscope, BriefcaseMedical } from 'lucide-react'
import { createSpecialty, deleteSpecialty, createDoctor, deleteDoctor, type Specialty, type Doctor } from '@/app/admin/requests/catalog-actions'
import { useToast } from '@/hooks/use-toast'

interface CatalogManagerProps {
  institutionId: string
  specialties: Specialty[]
  doctors: Doctor[]
}

export function CatalogManager({ institutionId, specialties, doctors }: CatalogManagerProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  // New Specialty State
  const [newSpecialtyName, setNewSpecialtyName] = useState('')

  // New Doctor State
  const [newDoctorName, setNewDoctorName] = useState('')
  const [newDoctorSpecialty, setNewDoctorSpecialty] = useState('')

  const handleCreateSpecialty = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSpecialtyName) return
    startTransition(async () => {
      const res = await createSpecialty(institutionId, newSpecialtyName)
      if (res.success) {
        setNewSpecialtyName('')
        toast({ title: 'Especialidad creada' })
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' })
      }
    })
  }

  const handleDeleteSpecialty = (id: string) => {
    if (!confirm('¿Eliminar esta especialidad?')) return
    startTransition(async () => {
      const res = await deleteSpecialty(id)
      if (res.success) toast({ title: 'Especialidad eliminada' })
      else toast({ title: 'Error', description: res.error, variant: 'destructive' })
    })
  }

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDoctorName) return
    startTransition(async () => {
      const res = await createDoctor(institutionId, newDoctorName, newDoctorSpecialty)
      if (res.success) {
        setNewDoctorName('')
        setNewDoctorSpecialty('')
        toast({ title: 'Médico creado' })
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' })
      }
    })
  }

  const handleDeleteDoctor = (id: string) => {
    if (!confirm('¿Eliminar este médico?')) return
    startTransition(async () => {
      const res = await deleteDoctor(id)
      if (res.success) toast({ title: 'Médico eliminado' })
      else toast({ title: 'Error', description: res.error, variant: 'destructive' })
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-slate-500 border-slate-200 hover:bg-slate-50">
          <Settings className="w-3.5 h-3.5" />
          Configurar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gestión de Catálogos</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="doctors" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="doctors" className="gap-2">
              <Stethoscope className="w-4 h-4" /> Doctores
            </TabsTrigger>
            <TabsTrigger value="specialties" className="gap-2">
              <BriefcaseMedical className="w-4 h-4" /> Especialidades
            </TabsTrigger>
          </TabsList>

          {/* DOCTORS TAB */}
          <TabsContent value="doctors" className="space-y-4 mt-4">
            <form onSubmit={handleCreateDoctor} className="flex gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Nombre del Doctor</Label>
                <Input value={newDoctorName} onChange={e => setNewDoctorName(e.target.value)} placeholder="Ej. Dr. García" required className="h-8 text-sm bg-white" />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Especialidad (Opcional)</Label>
                <Select value={newDoctorSpecialty} onValueChange={setNewDoctorSpecialty}>
                  <SelectTrigger className="h-8 text-sm bg-white">
                    <SelectValue placeholder="Ninguna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna</SelectItem>
                    {specialties.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" size="sm" disabled={pending} className="h-8 bg-teal-600 hover:bg-teal-700">
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </form>

            <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1">
              {doctors.map(doc => {
                const spec = specialties.find(s => s.id === doc.specialty_id)
                return (
                  <div key={doc.id} className="flex items-center justify-between p-2 rounded-md border border-slate-100 hover:bg-slate-50">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">{doc.name}</span>
                      {spec && <span className="text-xs text-slate-400">{spec.name}</span>}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteDoctor(doc.id)} disabled={pending}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )
              })}
              {doctors.length === 0 && <p className="text-xs text-center text-slate-400 py-4">No hay doctores registrados.</p>}
            </div>
          </TabsContent>

          {/* SPECIALTIES TAB */}
          <TabsContent value="specialties" className="space-y-4 mt-4">
            <form onSubmit={handleCreateSpecialty} className="flex gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Nueva Especialidad</Label>
                <Input value={newSpecialtyName} onChange={e => setNewSpecialtyName(e.target.value)} placeholder="Ej. Cardiología" required className="h-8 text-sm bg-white" />
              </div>
              <Button type="submit" size="sm" disabled={pending} className="h-8 bg-teal-600 hover:bg-teal-700">
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </form>

            <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1">
              {specialties.map(spec => (
                <div key={spec.id} className="flex items-center justify-between p-2 rounded-md border border-slate-100 hover:bg-slate-50">
                  <span className="text-sm font-medium text-slate-700">{spec.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteSpecialty(spec.id)} disabled={pending}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {specialties.length === 0 && <p className="text-xs text-center text-slate-400 py-4">No hay especialidades registradas.</p>}
            </div>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

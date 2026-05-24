'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createCustomRole } from '@/app/admin/roles/actions'
import { Checkbox } from '@/components/ui/checkbox'

const AVAILABLE_PERMISSIONS = [
  { id: 'requests.view', label: 'Ver Solicitudes' },
  { id: 'requests.edit', label: 'Editar/Responder Solicitudes' },
  { id: 'appointments.view', label: 'Ver Agenda de Citas' },
  { id: 'appointments.edit', label: 'Marcar Asistencia a Citas' },
  { id: 'reports.view', label: 'Ver Reportes y Métricas' },
  { id: 'forms.manage', label: 'Modificar Formularios' },
  { id: 'users.manage', label: 'Gestionar Usuarios' },
  { id: 'roles.manage', label: 'Gestionar Roles' },
  { id: 'settings.manage', label: 'Configuración de Institución' },
]

export function RoleForm({ institutionId }: { institutionId: string | null }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (institutionId) fd.append('institutionId', institutionId)
    
    startTransition(async () => {
      const res = await createCustomRole(fd)
      setResult(res)
      if (res.success) {
        (e.target as HTMLFormElement).reset()
        setTimeout(() => setResult(null), 4000)
      }
    })
  }

  return (
    <Card className="border-teal-100 shadow-sm sticky top-8">
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldPlus className="w-5 h-5 text-teal-600" />
          Crear Nuevo Rol
        </CardTitle>
        <CardDescription>
          Diseña un perfil de acceso combinando permisos específicos.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">

        {result?.success && (
          <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {result.message}
          </div>
        )}

        {result && !result.success && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {result.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Rol</Label>
            <Input id="name" name="name" placeholder="Ej. Recepcionista" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (Opcional)</Label>
            <Input id="description" name="description" placeholder="Atención al paciente en recepción" />
          </div>

          <div className="pt-4 border-t border-slate-100">
             <Label className="text-slate-600 font-bold mb-3 block">Permisos Asignados</Label>
             <div className="space-y-3">
                {AVAILABLE_PERMISSIONS.map(p => (
                   <div key={p.id} className="flex items-start space-x-3">
                      <Checkbox id={`perm_${p.id}`} name={`perm_${p.id}`} value="on" />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={`perm_${p.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 cursor-pointer"
                        >
                          {p.label}
                        </label>
                        <p className="text-[11px] text-slate-400 font-mono">{p.id}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          <Button type="submit" disabled={pending} className="w-full bg-teal-600 hover:bg-teal-700 mt-6">
            {pending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
              : <><ShieldPlus className="w-4 h-4 mr-2" /> Crear Rol</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MailPlus, Copy, CheckCheck, Loader2, AlertCircle, UserCheck } from 'lucide-react'
import { inviteAdminUser } from './actions'

interface InviteFormProps {
  canCreateSuperAdmin: boolean
  institutions: { id: string; name: string }[] | null
}

export function InviteUserForm({ canCreateSuperAdmin, institutions }: InviteFormProps) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    tempPassword?: string
    error?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await inviteAdminUser(fd)
      setResult(res)
      if (res.success) {
        (e.target as HTMLFormElement).reset()
      }
    })
  }

  function copyPassword() {
    if (result?.tempPassword) {
      navigator.clipboard.writeText(result.tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <Card className="border-teal-100 shadow-sm sticky top-8">
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <MailPlus className="w-5 h-5 text-teal-600" />
          Invitar Usuario
        </CardTitle>
        <CardDescription>
          Crea un perfil de administrador de forma segura. Las credenciales se mostrarán aquí y se enviarán al correo del usuario.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">

        {/* Success: show password */}
        {result?.success && result.tempPassword && (
          <div className="mb-6 rounded-xl border border-teal-200 overflow-hidden">
            <div className="bg-teal-50 px-4 py-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-600" />
              <p className="text-sm font-semibold text-teal-800">{result.message}</p>
            </div>
            <div className="bg-slate-900 px-4 py-4">
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Contraseña Temporal Generada</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-2xl font-bold text-emerald-400 tracking-[0.2em]">
                  {result.tempPassword}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={copyPassword}
                  className="text-slate-300 hover:text-white hover:bg-slate-700 shrink-0"
                >
                  {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>
            <div className="bg-amber-50 border-t border-amber-100 px-4 py-2">
              <p className="text-xs text-amber-700">⚠️ El correo con estas credenciales ha sido enviado. Anote la contraseña antes de cerrar esta sección.</p>
            </div>
          </div>
        )}

        {/* Error */}
        {result && !result.success && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {result.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico Oficial</Label>
            <Input id="email" name="email" type="email" placeholder="gestor@clinica.com" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Nivel de Acceso</Label>
            <select
              id="role"
              name="role"
              required
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="Gestor">Gestor / Asesor</option>
              <option value="Auditor">Auditor (Solo Lectura)</option>
              {canCreateSuperAdmin && (
                <>
                  <option value="Admin Institución">Líder Institución</option>
                  <option value="Super Admin">Super Admin (Dueño)</option>
                </>
              )}
            </select>
          </div>

          {institutions && (
            <div className="space-y-2">
              <Label htmlFor="institutionId">Asignar a Institución</Label>
              <select
                id="institutionId"
                name="institutionId"
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="">Sin institución (Global / Super Admin)</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" disabled={pending} className="w-full bg-teal-600 hover:bg-teal-700 mt-2">
            {pending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando usuario...</>
              : <><MailPlus className="w-4 h-4 mr-2" /> Invitar y Generar Clave</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

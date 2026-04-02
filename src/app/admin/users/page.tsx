import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { inviteAdminUser, toggleUserStatus } from './actions'
import { Users, Clock, ShieldCheck, MailPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function UsersPage() {
  const supabase = await createClient()

  // Verify Role and User
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase.from('users').select('role, institution_id').eq('id', user?.id).single()

  if (!userProfile) {
     return <div className="p-8">No autorizado. Perfil de usuario no encontrado.</div>
  }

  // Fetch Users
  const { data: users } = await supabase
    .from('users')
    .select(`
        id, email, role, active, created_at,
        institutions ( id, name )
    `)
    .order('created_at', { ascending: false })

  // Super admins need to assign institution, so we should fetch institutions dropdown
  const { data: institutions } = userProfile.role === 'Super Admin' 
     ? await supabase.from('institutions').select('id, name') 
     : { data: null }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-teal-600" />
            Gestión de Usuarios
          </h2>
          <p className="text-slate-500 mt-1">
            Revisa, invita y revoca accesos a los administradores de la plataforma.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creation Form */}
        <div className="lg:col-span-1">
           <Card className="border-teal-100 shadow-sm sticky top-8">
              <CardHeader className="bg-slate-50 border-b">
                 <CardTitle className="text-lg flex items-center gap-2">
                    <MailPlus className="w-5 h-5 text-teal-600" />
                    Invitar Usuario
                 </CardTitle>
                 <CardDescription>Crea un perfil de administrador desde panel seguro. Se le dará una clave temporal.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                 {/* 
                     Server actions inside forms with complicated dropdowns require standard inputs or JS interception.
                     Since we use Client Components for Select (shadcn default is client/server hybrid compatible if we stick hidden inputs).
                     Wait: Shadcn <Select> expects to render its value. The simplest way without 'use client' is a native <select> or use a client wrapper.
                     For full Next14 SSR, we'll implement a native select with shadcn styling.
                 */}
                 <form action={async (formData) => {
                    'use server'
                    await inviteAdminUser(formData)
                 }} className="space-y-4">
                    <div className="space-y-2">
                       <Label htmlFor="email">Correo Electrónico Oficial</Label>
                       <Input id="email" name="email" type="email" placeholder="gestor@eps.com" required />
                    </div>
                    
                    <div className="space-y-2">
                       <Label htmlFor="role">Nivel de Acceso</Label>
                       <select id="role" name="role" required className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                          <option value="Gestor">Gestor / Asesor</option>
                          <option value="Auditor">Auditor (Lectura)</option>
                          {userProfile.role === 'Super Admin' && (
                              <>
                                <option value="Admin Institución">Líder Institución</option>
                                <option value="Super Admin">Master / Super Admin</option>
                              </>
                          )}
                       </select>
                    </div>

                    {userProfile.role === 'Super Admin' && institutions && (
                        <div className="space-y-2">
                           <Label htmlFor="institutionId">Asignar a Institución</Label>
                           <select id="institutionId" name="institutionId" className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-950">
                              <option value="">Seleccione... (Global si SuperAdmin)</option>
                              {institutions.map(inst => (
                                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                              ))}
                           </select>
                        </div>
                    )}
                    
                    <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 mt-6">
                       Invitar y Generar Clave
                    </Button>
                    <p className="text-xs text-slate-400 mt-2 text-center">La contraseña generada aparecerá en los logs por un instante. Anótela.</p>
                 </form>
              </CardContent>
           </Card>
        </div>

        {/* Existing Users Table */}
        <div className="lg:col-span-2">
           <Card className="shadow-sm">
             <CardHeader className="flex flex-row items-center justify-between">
               <CardTitle className="text-lg">Directorio de Administradores</CardTitle>
               <ShieldCheck className="w-5 h-5 text-slate-400" />
             </CardHeader>
             <CardContent>
                <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
                   <Table>
                      <TableHeader className="bg-slate-50">
                         <TableRow>
                            <TableHead className="font-semibold text-slate-800">Usuario</TableHead>
                            <TableHead className="font-semibold text-slate-800">Institución</TableHead>
                            <TableHead className="font-semibold text-slate-800">Rol Sistema</TableHead>
                            <TableHead className="font-semibold text-slate-800">Estado</TableHead>
                            <TableHead className="font-semibold text-slate-800 text-right">Acción</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!users || users.length === 0 ? (
                           <TableRow>
                              <TableCell colSpan={5} className="text-center py-6 text-slate-500">No hay usuarios registrados.</TableCell>
                           </TableRow>
                        ) : (
                           users.map((u: any) => (
                              <TableRow key={u.id} className="hover:bg-slate-50/50">
                                 <TableCell className="font-medium text-slate-800">
                                    <div className="flex flex-col">
                                       <span>{u.email}</span>
                                       <span className="text-[10px] text-slate-400 font-mono tracking-tighter mt-1">{u.id}</span>
                                    </div>
                                 </TableCell>
                                 <TableCell>
                                    {u.institutions?.name ? 
                                       <Badge variant="outline" className="bg-white">{u.institutions.name}</Badge> 
                                     : <span className="text-xs text-slate-400 font-medium">GLOBAL SYSTEM</span>}
                                 </TableCell>
                                 <TableCell>
                                    <Badge variant={u.role === 'Super Admin' ? 'default' : 'secondary'} className={`${u.role === 'Super Admin' ? 'bg-indigo-600' : 'bg-slate-100 text-slate-700'}`}>
                                       {u.role}
                                    </Badge>
                                 </TableCell>
                                 <TableCell>
                                     <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className={`text-sm ${u.active ? 'text-green-700' : 'text-red-700 font-semibold'}`}>{u.active ? 'Activo' : 'Revocado'}</span>
                                     </div>
                                 </TableCell>
                                 <TableCell className="text-right">
                                    <form action={async () => {
                                       'use server'
                                       await toggleUserStatus(u.id, u.active)
                                    }}>
                                       <Button variant={u.active ? "outline" : "default"} size="sm" className={!u.active ? "bg-red-600 hover:bg-red-700 text-white" : ""}>
                                          {u.active ? 'Suspender' : 'Reactivar'}
                                       </Button>
                                    </form>
                                 </TableCell>
                              </TableRow>
                           ))
                        )}
                      </TableBody>
                   </Table>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}

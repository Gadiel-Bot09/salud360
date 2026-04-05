import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toggleUserStatus } from './actions'
import { Users, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { InviteUserForm } from './invite-form'

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase.from('users').select('role, institution_id').eq('id', user?.id).single()

  if (!userProfile) {
     return <div className="p-8">No autorizado. Perfil de usuario no encontrado.</div>
  }

  const { data: users } = await supabase
    .from('users')
    .select(`id, email, role, active, created_at, institutions ( id, name )`)
    .order('created_at', { ascending: false })

  const { data: institutions } = userProfile.role === 'Super Admin' 
     ? await supabase.from('institutions').select('id, name') 
     : { data: null }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Users className="w-8 h-8 text-teal-600" />
          Gestión de Usuarios
        </h2>
        <p className="text-slate-500 mt-1">
          Invita, gestiona y revoca accesos a los administradores de tu institución.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Invite Form — Client Component that shows generated password */}
        <div className="lg:col-span-1">
          <InviteUserForm
            canCreateSuperAdmin={userProfile.role === 'Super Admin'}
            institutions={institutions}
          />
        </div>

        {/* Users Directory Table */}
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
                            <TableHead className="font-semibold text-slate-800">Rol</TableHead>
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
                           // eslint-disable-next-line @typescript-eslint/no-explicit-any
                           users.map((u: any) => (
                              <TableRow key={u.id} className="hover:bg-slate-50/50">
                                 <TableCell className="font-medium text-slate-800">
                                    <div className="flex flex-col">
                                       <span>{u.email}</span>
                                       <span className="text-[10px] text-slate-400 font-mono tracking-tighter mt-0.5">{u.id}</span>
                                    </div>
                                 </TableCell>
                                 <TableCell>
                                    {u.institutions?.name ? 
                                       <Badge variant="outline" className="bg-white">{u.institutions.name}</Badge> 
                                     : <span className="text-xs text-slate-400 font-medium">GLOBAL SYSTEM</span>}
                                 </TableCell>
                                 <TableCell>
                                    <Badge className={`${u.role === 'Super Admin' ? 'bg-indigo-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}`}>
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
                                       <Button
                                         variant={u.active ? 'outline' : 'default'}
                                         size="sm"
                                         className={!u.active ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'border-red-200 text-red-600 hover:bg-red-50'}
                                       >
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

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { RoleForm } from '@/components/admin/role-form'

export default async function RolesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase.from('users').select('role_id, institution_id, roles(name)').eq('id', user?.id).single()

  if (!userProfile) {
     return <div className="p-8">No autorizado. Perfil de usuario no encontrado.</div>
  }

  const isSuperAdmin = userProfile.roles?.name === 'Super Admin'

  let rolesQuery = supabase.from('roles').select('id, name, description, is_system, permissions')
  if (!isSuperAdmin) {
     rolesQuery = rolesQuery.or(`institution_id.eq.${userProfile.institution_id},is_system.eq.true`)
  }

  const { data: roles } = await rolesQuery.order('is_system', { ascending: false }).order('name')

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-8 h-8 text-teal-600" />
          Gestión de Roles y Permisos
        </h2>
        <p className="text-slate-500 mt-1">
          Crea roles personalizados y define los accesos específicos que tendrán los usuarios dentro de la plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Role Form */}
        <div className="lg:col-span-1">
          <RoleForm institutionId={isSuperAdmin ? null : userProfile.institution_id} />
        </div>

        {/* Roles List */}
        <div className="lg:col-span-2">
           <Card className="shadow-sm">
             <CardHeader className="flex flex-row items-center justify-between">
               <CardTitle className="text-lg">Roles Disponibles</CardTitle>
               <ShieldCheck className="w-5 h-5 text-slate-400" />
             </CardHeader>
             <CardContent>
                <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
                   <Table>
                      <TableHeader className="bg-slate-50">
                         <TableRow>
                            <TableHead className="font-semibold text-slate-800">Nombre del Rol</TableHead>
                            <TableHead className="font-semibold text-slate-800">Tipo</TableHead>
                            <TableHead className="font-semibold text-slate-800">Permisos</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!roles || roles.length === 0 ? (
                           <TableRow>
                              <TableCell colSpan={3} className="text-center py-6 text-slate-500">No hay roles registrados.</TableCell>
                           </TableRow>
                        ) : (
                           roles.map((r: any) => (
                              <TableRow key={r.id} className="hover:bg-slate-50/50">
                                 <TableCell className="font-medium text-slate-800">
                                    <div className="flex flex-col">
                                       <span>{r.name}</span>
                                       {r.description && <span className="text-xs text-slate-400 mt-0.5">{r.description}</span>}
                                    </div>
                                 </TableCell>
                                 <TableCell>
                                    <Badge variant={r.is_system ? 'default' : 'outline'} className={r.is_system ? 'bg-indigo-600' : 'bg-white'}>
                                       {r.is_system ? 'Sistema' : 'Personalizado'}
                                    </Badge>
                                 </TableCell>
                                 <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {r.permissions.includes('*') ? (
                                        <Badge variant="secondary" className="text-xs bg-slate-100">Acceso Total (*)</Badge>
                                      ) : r.permissions.length === 0 ? (
                                        <span className="text-xs text-slate-400">Sin permisos</span>
                                      ) : (
                                        r.permissions.map((p: string) => (
                                          <Badge key={p} variant="secondary" className="text-[10px] bg-slate-100 px-1 py-0">{p}</Badge>
                                        ))
                                      )}
                                    </div>
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

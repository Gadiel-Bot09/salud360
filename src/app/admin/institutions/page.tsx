import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInstitution, deleteInstitution } from './actions'
import { Building2, Plus, Trash2 } from 'lucide-react'
import { revalidatePath } from 'next/cache'

export default async function InstitutionsPage() {
  const supabase = await createClient()

  // Verify Role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase.from('users').select('role').eq('id', user?.id).single()

  if (userProfile?.role !== 'Super Admin') {
    return (
      <div className="p-8 text-center mt-12">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Acceso Denegado</h2>
        <p className="text-slate-600">Solo los Super Administradores pueden gestionar Instituciones.</p>
      </div>
    )
  }

  // Fetch institutions
  const { data: institutions } = await supabase.from('institutions').select('*').order('created_at', { ascending: false })

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Building2 className="w-8 h-8 text-teal-600" />
            Instituciones Médicas
          </h2>
          <p className="text-slate-500 mt-1">
            Administra los " tenants " que pueden procesar radicados en la plataforma.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creation Form */}
        <div className="lg:col-span-1">
           <Card className="border-teal-100 shadow-sm sticky top-8">
              <CardHeader className="bg-slate-50 border-b">
                 <CardTitle className="text-lg">Nueva Institución</CardTitle>
                 <CardDescription>Añade una nueva EPS, Clínica u Hospital al sistema.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                 <form action={async (formData) => {
                    'use server'
                    await createInstitution(formData)
                 }} className="space-y-4">
                    <div className="space-y-2">
                       <Label htmlFor="name">Razón Social</Label>
                       <Input id="name" name="name" placeholder="Ej. EPS Sanitas" required />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="logo_url">URL del Logo (Opcional)</Label>
                       <Input id="logo_url" name="logo_url" placeholder="https://..." type="url" />
                    </div>
                    
                    <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                       <Plus className="w-4 h-4 mr-2" />
                       Crear Institución
                    </Button>
                 </form>
              </CardContent>
           </Card>
        </div>

        {/* Existing Table */}
        <div className="lg:col-span-2">
           <Card className="shadow-sm">
             <CardHeader>
               <CardTitle className="text-lg">Directorio Activo</CardTitle>
             </CardHeader>
             <CardContent>
                <Table>
                   <TableHeader>
                      <TableRow>
                         <TableHead>Nombre / Razón Social</TableHead>
                         <TableHead>Logo</TableHead>
                         <TableHead className="w-[100px] text-right">Acciones</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                     {!institutions || institutions.length === 0 ? (
                        <TableRow>
                           <TableCell colSpan={3} className="text-center py-6 text-slate-500">No hay instituciones registradas.</TableCell>
                        </TableRow>
                     ) : (
                        institutions.map(inst => (
                           <TableRow key={inst.id}>
                              <TableCell className="font-medium text-slate-800">{inst.name}</TableCell>
                              <TableCell>
                                 {inst.logo_url ? <img src={inst.logo_url} alt="Logo" className="h-6 object-contain" /> : <span className="text-xs text-slate-400">N/A</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                 <form action={async () => {
                                    'use server'
                                    await deleteInstitution(inst.id)
                                 }}>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" title="Eliminar Institución">
                                       <Trash2 className="w-4 h-4" />
                                    </Button>
                                 </form>
                              </TableCell>
                           </TableRow>
                        ))
                     )}
                   </TableBody>
                </Table>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Settings } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userProfile } = await supabase.from('users').select('role_id, institution_id, roles(permissions)').eq('id', user.id).single()
  
  const perms = userProfile?.roles?.permissions || []
  if (!perms.includes('templates.manage') && !perms.includes('*')) {
    redirect('/admin/dashboard')
  }

  const { data: templates } = await supabase
    .from('legal_templates')
    .select('id, name, template_type, updated_at, form_templates(name)')
    .eq('institution_id', userProfile?.institution_id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-8 w-8 text-indigo-500" />
            Plantillas Legales
          </h1>
          <p className="text-slate-500 mt-1">Configura los documentos legales (ej. Historia Clínica) que requieren firma.</p>
        </div>
        <Link href="/admin/templates/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-slate-800 flex items-center justify-between">
                {t.name}
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${t.template_type === 'docx' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                  {t.template_type.toUpperCase()}
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Asociado al form: <span className="font-medium text-slate-700">{t.form_templates?.name || 'Ninguno'}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Actualizado: {new Date(t.updated_at).toLocaleDateString()}
                </span>
                <Link href={`/admin/templates/${t.id}`}>
                  <Button variant="ghost" size="sm" className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!templates || templates.length === 0) && (
          <div className="col-span-full py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-700 font-medium">No hay plantillas configuradas</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">Crea tu primera plantilla legal para inyectar datos dinámicos.</p>
            <Link href="/admin/templates/new">
              <Button variant="outline">Crear Plantilla</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

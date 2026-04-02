import { createClient } from '@/lib/supabase/server'
import { FormBuilder } from '@/components/admin/form-builder'
import { FileEdit } from 'lucide-react'
import { saveFormTemplate } from './actions'

export default async function FormsAdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase.from('users').select('institution_id').eq('id', user?.id).single()

  if (!userProfile?.institution_id) {
     return (
        <div className="p-8 mt-12 text-center max-w-lg mx-auto bg-white rounded-lg border shadow-sm">
           <FileEdit className="w-12 h-12 text-slate-300 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-slate-800">No asigando a Institución</h3>
           <p className="text-slate-500 mt-2">Los Formularios Dinámicos se configuran por EPS/Clínica. Comunícate con tu Super Admin para que te asocie a una organización usando el módulo de Usuarios.</p>
        </div>
     )
  }

  // Fetch Existing Template
  const { data: template } = await supabase
    .from('form_templates')
    .select('*')
    .eq('institution_id', userProfile.institution_id)
    .single()

  const initialFields = template?.fields_json || []

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FileEdit className="w-8 h-8 text-teal-600" />
          Constructor de Radicados
        </h2>
        <p className="text-slate-500 mt-1 max-w-3xl">
          Diseña el formulario que los pacientes de tu Institución llenarán en el Portal Público.
          Agrega campos específicos como "Tipo de Cita" u "Órden Médica" según tus necesidades.
        </p>
      </div>

      <div className="mt-8">
         <FormBuilder 
            initialFields={initialFields} 
            templateId={template?.id || null} 
            institutionId={userProfile.institution_id} 
            onSave={saveFormTemplate} 
         />
      </div>
    </div>
  )
}

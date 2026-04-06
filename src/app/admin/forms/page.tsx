import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { FormBuilder, parseTemplate } from '@/components/admin/form-builder'
import { FileEdit, Building2 } from 'lucide-react'
import { saveFormTemplate } from './actions'
import Link from 'next/link'

export default async function FormsAdminPage({ searchParams }: { searchParams: { inst?: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase.from('users').select('role, institution_id').eq('id', user?.id).single()

  // Determine active institution context
  let activeInstitutionId = userProfile?.institution_id

  // If Super Admin, they can pick from query params, or default to nothing requiring selection
  if (userProfile?.role === 'Super Admin') {
      activeInstitutionId = searchParams.inst || null
  }

  // Fetch Institutions exclusively if Super Admin (for dropdown selector)
  const { data: institutions } = userProfile?.role === 'Super Admin' 
       ? await supabase.from('institutions').select('id, name') 
       : { data: null }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      
      {/* Header and Context Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
         <div>
           <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
             <FileEdit className="w-8 h-8 text-teal-600" />
             Constructor de Radicados
           </h2>
           <p className="text-slate-500 mt-1 max-w-3xl">
             Diseña el formulario que los pacientes llenarán en el Portal Público.
             Agrega campos específicos como &quot;Tipo de Cita&quot; u &quot;Órden Médica&quot; según las necesidades institucionales.
           </p>
         </div>

         {/* Super Admin Context Switcher */}
         {userProfile?.role === 'Super Admin' && (
             <div className="w-full md:w-auto bg-white p-4 border rounded-xl shadow-sm space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Contexto Global (Dueño)
                 </label>
                 <select 
                    className="flex h-10 w-full md:w-64 items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                    defaultValue={activeInstitutionId || ""}
                 >
                    <option value="" disabled>Seleccione una Clínica...</option>
                    {institutions?.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                 </select>
                 <script dangerouslySetInnerHTML={{__html: `
                    document.currentScript.previousElementSibling.addEventListener('change', function(e) {
                        window.location.href = '/admin/forms?inst=' + e.target.value;
                    });
                 `}} />
             </div>
         )}
      </div>

      {/* Main Content Area */}
      {!activeInstitutionId ? (
          <div className="p-12 mt-4 text-center max-w-lg mx-auto bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
             <FileEdit className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-slate-800">Institución No Seleccionada</h3>
             <p className="text-slate-500 mt-2">
                {userProfile?.role === 'Super Admin' 
                   ? 'Por favor, selecciona una clínica en el menú superior para empezar a fabricar su cuestionario privado.' 
                   : 'Comunícate con Soporte Técnico para que asocien tu perfil a una organización.'}
             </p>
          </div>
      ) : (
         <DataLoader activeInstitutionId={activeInstitutionId} supabase={supabase} />
      )}
    </div>
  )
}

// Sub-component to keep async clean
async function DataLoader({ activeInstitutionId, supabase }: { activeInstitutionId: string, supabase: any }) {
    // Use admin client to bypass RLS on form_templates reads
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: template } = await supabaseAdmin
       .from('form_templates')
       .select('*')
       .eq('institution_id', activeInstitutionId)
       .single()

    const initialTemplate = parseTemplate(template?.fields_json || null)
    const initialFields = initialTemplate.fields

    return (
        <div className="mt-4 space-y-6">

           {/* ── Current Template Summary (read-only top preview) ── */}
           {template && initialFields.length > 0 && (
             <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                   <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <span className="text-base">📋</span>
                      Campos activos en el portal público
                   </h3>
                   <span className="text-xs text-slate-400 font-medium">
                      {initialFields.length} campo{initialFields.length !== 1 ? 's' : ''} · {initialTemplate.requestTypes.length} tipo{initialTemplate.requestTypes.length !== 1 ? 's' : ''} de trámite
                   </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                   {initialFields.map((f: any, i: number) => (
                      <div key={f.id || i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
                         <span className="shrink-0">
                            {f.type === 'text' && '✏️'}
                            {f.type === 'email' && '📧'}
                            {f.type === 'number' && '🔢'}
                            {f.type === 'date' && '📅'}
                            {f.type === 'select' && '🔽'}
                            {f.type === 'file' && '📎'}
                            {f.type === 'textarea' && '📝'}
                         </span>
                         <span className="font-medium text-slate-700 truncate">{f.label || '(sin nombre)'}</span>
                         {f.required && <span className="ml-auto text-red-400 font-bold shrink-0">*</span>}
                      </div>
                   ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">
                   Estos campos aparecen en el formulario del paciente. Edítalos abajo y presiona <strong>Publicar Cambios</strong>.
                </p>
             </div>
           )}

           <FormBuilder 
              initialTemplate={initialTemplate}
              initialTemplateName={template?.name}
              templateId={template?.id || null} 
              institutionId={activeInstitutionId} 
              onSave={saveFormTemplate} 
           />
        </div>
    )
}

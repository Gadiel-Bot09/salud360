import { getTemplateData, getFormsList, saveTemplate } from './actions'
import { TemplateEditor } from '@/components/admin/template-editor'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { success, data, error } = await getTemplateData(id)

  if (!success && id !== 'new') {
    redirect('/admin/templates')
  }

  const formsList = await getFormsList()

  return (
    <div className="p-6">
      <TemplateEditor 
        initialData={data} 
        templateId={id} 
        formsList={formsList}
        onSave={saveTemplate}
      />
    </div>
  )
}

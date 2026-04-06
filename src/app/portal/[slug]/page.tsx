import { getInstitutionBySlug, getInstitutionTemplate } from '@/app/actions'
import { RequestForm } from '@/components/patient/request-form'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function PortalPage({ params }: { params: { slug: string } }) {
  const institution = await getInstitutionBySlug(params.slug)

  if (!institution) {
     return notFound()
  }

  const template = await getInstitutionTemplate(institution.id)

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: institution.colors?.primary || '#0f766e' }}>
            Portal del Paciente
          </h1>
          <h2 className="mt-2 text-2xl font-bold text-slate-700">
             {institution.name}
          </h2>
          <p className="mt-4 text-xl text-slate-600 mb-6">
            Radica y gestiona tus solicitudes médicas, autorizaciones y citas de manera ágil y segura.
          </p>
          
          <Button asChild variant="outline" className="text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100 hover:text-teal-800">
            <Link href="/consulta">
               <Search className="w-4 h-4 mr-2" />
               Consultar Estado de mi Radicado
            </Link>
          </Button>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <RequestForm 
             institutionId={institution.id} 
             institutionName={institution.name} 
             template={template} 
          />
        </div>
      </div>
    </main>
  )
}

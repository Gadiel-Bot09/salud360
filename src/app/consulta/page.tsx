'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, ArrowLeft } from 'lucide-react'
import { trackRequest, TrackResult } from './actions'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

export default function ConsultaPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrackResult | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    const formData = new FormData(e.currentTarget)
    
    try {
       // Manual call to server action since this gives us easy state control without experimental hooks
       const response = await trackRequest(null, formData)
       setResult(response)
    } catch (err) {
       setResult({ success: false, message: 'Ocurrió un error inesperado al intentar conectarse al servidor.' })
    } finally {
       setLoading(false)
    }
  }

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'received': 'Recibida',
      'processing': 'En Trámite',
      'responded': 'Respondida',
      'closed': 'Cerrada',
      'escalated': 'Escalada'
    }
    return statusMap[status] || status
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16 sm:justify-center p-4">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        
        {/* Header CTA */}
        <div className="mb-8">
            <Link href="/" className="text-teal-700 hover:text-teal-900 flex items-center gap-2 mb-4 font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver al Inicio
            </Link>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Consultar Estado de Radicado</h1>
            <p className="text-slate-500 mt-2">Ingrese el número de radicado que le fue asignado y su documento de identidad para ver el historial y estado de su trámite.</p>
        </div>

        {/* Search Box */}
        <Card className="shadow-sm border-teal-100">
           <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle className="text-lg">Datos de Búsqueda</CardTitle>
                <CardDescription>Solo encontrará solicitudes donde ambos datos coincidan exactamente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="radicado">Número de Radicado</Label>
                    <Input 
                        id="radicado" 
                        name="radicado" 
                        placeholder="Ej. RAD-2024-SYS-XXXXXX" 
                        required 
                        className="uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="documentNumber">Número de Identidad</Label>
                    <Input id="documentNumber" name="documentNumber" placeholder="Ej. 1020304050" required />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t rounded-b-xl px-6 py-4 flex justify-between items-center">
                 {result?.success === false && (
                    <p className="text-red-500 text-sm font-medium">{result.message}</p>
                 )}
                 {!result?.success && <div />}
                 <Button type="submit" disabled={loading} className="bg-teal-700 hover:bg-teal-800">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Consultar Radicado
                 </Button>
              </CardFooter>
           </form>
        </Card>

        {/* Results Timeline */}
        {result?.success && result.data && (
           <Card className="border-teal-200 mt-8 shadow-md">
              <CardHeader className="bg-teal-50 border-b border-teal-100 pb-4 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                    <Badge variant="outline" className="mb-2 bg-white text-teal-800 border-teal-200">{result.data.radicado}</Badge>
                    <CardTitle className="text-teal-900 text-xl">{result.data.type}</CardTitle>
                 </div>
                 <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">ESTADO ACTUAL</p>
                    <Badge className="text-sm px-3 py-1" variant={result.data.status === 'closed' ? 'secondary' : 'default'}>
                        {translateStatus(result.data.status)}
                    </Badge>
                 </div>
              </CardHeader>

              <CardContent className="pt-8">
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                  {result.data.request_history.map((hist: any, index: number) => (
                    <div key={hist.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      
                      {/* Timeline Dot */}
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${index === 0 ? 'bg-teal-100' : 'bg-slate-100'}`}>
                         <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-teal-600 animate-pulse' : 'bg-slate-400'}`}></div>
                      </div>

                      {/* Content Card */}
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <h4 className="font-bold text-slate-800 text-base">{hist.action}</h4>
                          <time className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                             {format(new Date(hist.created_at), "d MMMM yyyy, HH:mm", { locale: es })}
                          </time>
                        </div>
                        {hist.comment && (
                           <div className="text-slate-600 text-sm mt-3 bg-slate-50 p-3 rounded border-l-4 border-slate-200 italic">
                               "{hist.comment}"
                           </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
           </Card>
        )}

      </div>
    </div>
  )
}

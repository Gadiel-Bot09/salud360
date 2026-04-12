'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, ArrowLeft, FileText, ChevronRight, CheckCircle2, Clock, AlertTriangle, Send } from 'lucide-react'
import { trackRequest, TrackResult } from './actions'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  received:   { label: 'Recibida',   color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Clock },
  processing: { label: 'En Trámite', color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: AlertTriangle },
  responded:  { label: 'Respondida', color: 'bg-teal-100 text-teal-700 border-teal-200',     icon: Send },
  closed:     { label: 'Cerrada',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  escalated:  { label: 'Escalada',   color: 'bg-red-100 text-red-700 border-red-200',        icon: AlertTriangle },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock }
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${s.color}`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  )
}

function RequestTimeline({ data }: { data: any }) {
  return (
    <Card className="border-teal-200 mt-6 shadow-md">
      <CardHeader className="bg-teal-50 border-b border-teal-100 rounded-t-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider mb-1">Radicado</p>
            <span className="font-mono text-lg font-bold text-teal-800 bg-white border border-teal-200 px-3 py-1 rounded-lg">
              {data.radicado}
            </span>
            <CardTitle className="text-slate-800 text-lg mt-2">{data.type}</CardTitle>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Estado Actual</p>
            <StatusBadge status={data.status} />
            <p className="text-xs text-slate-400 mt-2">
              Radicada el {format(new Date(data.created_at), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-8 pb-6">
        {data.request_history.length === 0 ? (
          <p className="text-center text-slate-400 py-6">Sin historial de movimientos aún.</p>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {data.request_history.map((hist: any, index: number) => (
              <div key={hist.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                {/* Dot */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${index === 0 ? 'bg-teal-100' : 'bg-slate-100'}`}>
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-teal-600 animate-pulse' : 'bg-slate-400'}`} />
                </div>
                {/* Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-800">{hist.action}</h4>
                    <time className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">
                      {format(new Date(hist.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </time>
                  </div>
                  {hist.comment && (
                    <div className="text-slate-600 text-sm mt-3 bg-slate-50 p-3 rounded border-l-4 border-teal-300 italic">
                      &ldquo;{hist.comment}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ConsultaPage() {
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<TrackResult | null>(null)
  const [selected, setSelected] = useState<any | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setSelected(null)
    const formData = new FormData(e.currentTarget)
    try {
      const response = await trackRequest(null, formData)
      setResult(response)
      // If single result, auto-select it
      if (response.success && response.data) setSelected(response.data)
    } catch {
      setResult({ success: false, message: 'Ocurrió un error inesperado al conectarse al servidor.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-12 p-4">
      <div className="max-w-2xl w-full mx-auto space-y-6">

        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-teal-700 hover:text-teal-900 flex items-center gap-2 mb-4 font-medium transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio
          </Link>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Consultar Estado de Trámite</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Busque por <strong>número de radicado</strong>, por <strong>número de documento</strong>, o ingrese ambos para una búsqueda exacta.
          </p>
        </div>

        {/* Search Box */}
        <Card className="shadow-sm border-teal-100">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="w-5 h-5 text-teal-600" />
                Datos de Búsqueda
              </CardTitle>
              <CardDescription>
                Puede buscar con uno o ambos campos. Ingresar ambos da resultados más precisos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="radicado" className="font-semibold text-slate-700">
                    Número de Radicado
                    <span className="ml-1 text-xs text-slate-400 font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="radicado"
                    name="radicado"
                    placeholder="Ej. RAD-2024-SYS-XXXXXX"
                    className="uppercase tracking-wider font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentNumber" className="font-semibold text-slate-700">
                    Número de Documento
                    <span className="ml-1 text-xs text-slate-400 font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="documentNumber"
                    name="documentNumber"
                    placeholder="Ej. 1020304050"
                  />
                </div>
              </div>
              {/* Search mode indicators */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-3 py-1">
                  🔍 Solo radicado → búsqueda directa
                </span>
                <span className="text-xs bg-purple-50 text-purple-600 border border-purple-200 rounded-full px-3 py-1">
                  📋 Solo documento → historial completo
                </span>
                <span className="text-xs bg-teal-50 text-teal-600 border border-teal-200 rounded-full px-3 py-1">
                  ✅ Ambos → coincidencia exacta
                </span>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t rounded-b-xl px-6 py-4 flex justify-between items-center">
              {result?.success === false && (
                <p className="text-red-500 text-sm font-medium">{result.message}</p>
              )}
              {!result || result.success ? <div /> : null}
              <Button type="submit" disabled={loading} className="bg-teal-700 hover:bg-teal-800 ml-auto">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Consultar
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* ── Multiple results list ── */}
        {result?.success && result.multipleResults && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 px-1">
              <FileText className="w-4 h-4 text-teal-600" />
              <p className="text-sm font-semibold text-slate-700">
                Se encontraron <span className="text-teal-700">{result.multipleResults.length}</span> solicitudes para ese documento. Seleccione una:
              </p>
            </div>
            {result.multipleResults.map((r: any) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left border rounded-xl p-4 transition-all hover:shadow-md hover:border-teal-300 ${selected?.id === r.id ? 'border-teal-500 bg-teal-50 shadow-md' : 'bg-white border-slate-200'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-sm font-bold text-teal-700">{r.radicado}</span>
                    <p className="text-slate-600 text-sm mt-0.5">{r.type}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(r.created_at), "d 'de' MMMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={r.status} />
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Single result timeline ── */}
        {selected && <RequestTimeline data={selected} />}

      </div>
    </div>
  )
}

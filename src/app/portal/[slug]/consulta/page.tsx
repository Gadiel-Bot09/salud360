'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Loader2, Search, ArrowLeft, FileText, CheckCircle2, Clock,
  AlertTriangle, Send, X, ChevronRight, CalendarDays, ClipboardList,
  MessageSquare, Sparkles, ArrowRight, RotateCcw, Building2
} from 'lucide-react'
import { trackRequest, TrackResult } from './actions'
import { formatCO } from '@/lib/utils'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; border: string; description: string }> = {
  received:   { label: 'Recibida',   emoji: '📥', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',   description: 'Tu solicitud fue recibida y está en cola de atención.' },
  processing: { label: 'En Trámite', emoji: '⚙️', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  description: 'El equipo está revisando y procesando tu solicitud.' },
  responded:  { label: 'Respondida', emoji: '💬', color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',   description: 'Tu solicitud ha sido atendida. Revisa la respuesta abajo.' },
  closed:     { label: 'Cerrada',    emoji: '✅', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', description: 'Tu solicitud fue completamente resuelta y cerrada.' },
  escalated:  { label: 'Escalada',   emoji: '🔺', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',    description: 'Tu caso fue escalado a un nivel superior de atención.' },
}

const getStatus = (s: string) =>
  STATUS_CONFIG[s] || { label: s, emoji: '📋', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', description: 'Estado de tu solicitud.' }

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cfg = getStatus(status)
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <span>{cfg.emoji}</span> {cfg.label}
    </span>
  )
}

// ─── Request Card (in modal list) ─────────────────────────────────────────────

function RequestCard({ request, isSelected, onClick }: { request: any; isSelected: boolean; onClick: () => void }) {
  const cfg = getStatus(request.status)
  const date = new Date(request.created_at)
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 hover:shadow-md active:scale-[0.99] group ${
        isSelected
          ? 'border-teal-500 bg-teal-50 shadow-md'
          : 'border-slate-100 bg-white hover:border-teal-200 hover:bg-teal-50/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Radicado */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-black text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">
              {request.radicado}
            </span>
          </div>
          {/* Type */}
          <p className="text-slate-700 font-semibold text-sm truncate">{request.type}</p>
          {/* Date */}
          <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatCO(date, "d 'de' MMMM yyyy")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusPill status={request.status} />
          <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? 'translate-x-0.5 text-teal-600' : 'text-slate-300 group-hover:text-teal-400'}`} />
        </div>
      </div>
    </button>
  )
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function RequestDetail({ data, onBack }: { data: any; onBack: () => void }) {
  const cfg = getStatus(data.status)
  const hasResponse = data.status === 'responded' || data.status === 'closed'

  // Find the latest response comment from history
  const responseEntry = data.request_history?.find(
    (h: any) => h.action?.toLowerCase().includes('respond') || h.action?.toLowerCase().includes('cerr')
  )

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" /> Ver todas mis solicitudes
      </button>

      {/* Header card */}
      <div className={`rounded-2xl border-2 p-5 ${cfg.border} ${cfg.bg}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Radicado</p>
            <span className="font-mono text-xl font-black text-teal-800 bg-white border border-teal-200 px-3 py-1 rounded-xl shadow-sm">
              {data.radicado}
            </span>
            <p className="text-base font-bold text-slate-800 mt-3">{data.type}</p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Radicada el {formatCO(new Date(data.created_at), "d 'de' MMMM yyyy")}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <StatusPill status={data.status} />
            <p className={`text-xs font-medium max-w-[200px] text-right ${cfg.color}`}>{cfg.description}</p>
          </div>
        </div>
      </div>

      {/* Response box (if responded/closed) */}
      {hasResponse && responseEntry?.comment && (
        <div className="rounded-2xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-teal-800">Respuesta de la Institución</p>
              <p className="text-xs text-teal-600">{formatCO(new Date(responseEntry.created_at), "d MMM yyyy, HH:mm")}</p>
            </div>
          </div>
          <blockquote className="text-slate-700 text-sm leading-relaxed border-l-4 border-teal-400 pl-4 italic">
            "{responseEntry.comment}"
          </blockquote>
        </div>
      )}

      {/* In progress message */}
      {!hasResponse && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">Tu solicitud está siendo atendida</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Nuestro equipo está trabajando en tu caso. Te notificaremos por correo cuando haya novedades. ¡Gracias por tu paciencia! 🙏
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {data.request_history?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Historial de Movimientos
          </h3>
          <div className="space-y-3">
            {data.request_history.map((hist: any, index: number) => (
              <div key={hist.id} className="flex gap-3">
                {/* Dot & Line */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                    index === 0
                      ? 'bg-teal-500 border-teal-400 shadow-md shadow-teal-200'
                      : 'bg-white border-slate-200'
                  }`}>
                    {index === 0
                      ? <Sparkles className="h-3.5 w-3.5 text-white" />
                      : <div className="w-2 h-2 rounded-full bg-slate-300" />
                    }
                  </div>
                  {index < data.request_history.length - 1 && (
                    <div className="w-0.5 bg-slate-200 flex-1 mt-1" style={{ minHeight: 20 }} />
                  )}
                </div>
                {/* Content */}
                <div className={`flex-1 pb-3 ${index < data.request_history.length - 1 ? '' : ''}`}>
                  <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-bold ${index === 0 ? 'text-teal-700' : 'text-slate-700'}`}>
                        {hist.action}
                      </p>
                      <time className="text-[11px] text-slate-400 font-mono shrink-0 bg-slate-50 px-2 py-0.5 rounded-md">
                        {formatCO(new Date(hist.created_at), "d MMM, HH:mm")}
                      </time>
                    </div>
                    {hist.comment && (
                      <p className="text-slate-500 text-xs mt-1.5 leading-relaxed border-t border-slate-50 pt-1.5">
                        {hist.comment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ResultModal({
  result,
  onClose,
}: {
  result: TrackResult
  onClose: () => void
}) {
  const [selected, setSelected] = useState<any | null>(
    result.data ? result.data : null
  )

  const requests: any[] = result.multipleResults ?? (result.data ? [result.data] : [])

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Panel */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90dvh' }}>

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center">
              <FileText className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">
                {selected ? 'Detalle de Solicitud' : `${requests.length} solicitud${requests.length !== 1 ? 'es' : ''} encontrada${requests.length !== 1 ? 's' : ''}`}
              </p>
              <p className="text-xs text-slate-400">
                {selected ? selected.radicado : 'Selecciona una para ver el detalle'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5">
          {selected ? (
            <RequestDetail
              data={selected}
              onBack={requests.length > 1 ? () => setSelected(null) : onClose}
            />
          ) : (
            <div className="space-y-4">
              {/* Friendly header */}
              <div className="text-center py-3">
                <p className="text-2xl mb-1">👋</p>
                <p className="text-slate-700 font-semibold text-sm">¡Hola! Aquí están tus solicitudes</p>
                <p className="text-slate-400 text-xs mt-1">Ordenadas de la más reciente a la más antigua. Toca cualquiera para ver el detalle.</p>
              </div>

              {/* List */}
              <div className="space-y-3">
                {requests.map((r, i) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    isSelected={selected?.id === r.id}
                    onClick={() => setSelected(r)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
          <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <Building2 className="h-3 w-3" />
            Portal administrado por Salud360
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConsultaPage() {
  const params = useParams() as { slug: string }
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<TrackResult | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setError(null)
    setShowModal(false)

    const formData = new FormData(e.currentTarget)
    try {
      const response = await trackRequest(params.slug, null, formData)
      setResult(response)
      if (response.success) {
        setShowModal(true)
      } else {
        setError(response.message || 'No se encontraron resultados.')
      }
    } catch {
      setError('Ocurrió un error inesperado. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setResult(null)
    setError(null)
    setShowModal(false)
    formRef.current?.reset()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex flex-col">

      {/* Back link */}
      <div className="max-w-lg mx-auto w-full px-4 pt-10 pb-2">
        <Link
          href={`/portal/${params.slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Portal
        </Link>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 pb-16">
        <div className="max-w-lg w-full space-y-8">

          {/* Hero text */}
          <div className="text-center pt-6">
            <div className="w-16 h-16 bg-teal-100 border-2 border-teal-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Search className="w-8 h-8 text-teal-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              ¿Cómo va tu solicitud?
            </h1>
            <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto leading-relaxed">
              Ingresa tu número de documento <strong>o</strong> tu número de radicado y te mostramos el estado en segundos. 🔍
            </p>
          </div>

          {/* Search card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            {/* Card top accent */}
            <div className="h-1.5 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600" />

            <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-4">
                {/* Document number */}
                <div className="space-y-2">
                  <Label htmlFor="documentNumber" className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-lg flex items-center justify-center text-xs font-black">1</span>
                    Número de Documento
                    <span className="text-xs text-slate-400 font-normal">(sin puntos ni espacios)</span>
                  </Label>
                  <Input
                    id="documentNumber"
                    name="documentNumber"
                    placeholder="Ej: 1020304050"
                    className="h-12 text-base border-slate-200 focus:border-teal-400 rounded-xl"
                    inputMode="numeric"
                  />
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                    ó también
                  </span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Radicado */}
                <div className="space-y-2">
                  <Label htmlFor="radicado" className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-xs font-black">2</span>
                    Número de Radicado
                    <span className="text-xs text-slate-400 font-normal">(si ya lo tienes)</span>
                  </Label>
                  <Input
                    id="radicado"
                    name="radicado"
                    placeholder="Ej: RAD-2024-SYS-ABC123"
                    className="h-12 text-base uppercase font-mono border-slate-200 focus:border-teal-400 rounded-xl tracking-wider"
                  />
                </div>
              </div>

              {/* Tips */}
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">💡 Cómo buscar</p>
                <ul className="space-y-1">
                  {[
                    ['📋', 'Solo documento → verás todas tus solicitudes'],
                    ['🔖', 'Solo radicado → vas directo a esa solicitud'],
                    ['✅', 'Ambos → búsqueda exacta y más segura'],
                  ].map(([emoji, text]) => (
                    <li key={text} className="flex items-center gap-2 text-xs text-teal-700">
                      <span>{emoji}</span> {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in duration-300">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700">No encontramos resultados 😕</p>
                    <p className="text-xs text-red-600 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {(result || error) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="flex-none rounded-xl h-12 px-4 border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-12 rounded-xl text-base font-bold bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all hover:shadow-teal-300 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {loading
                    ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Buscando...</>
                    : <><Search className="h-5 w-5 mr-2" /> Consultar mis solicitudes</>
                  }
                </Button>
              </div>

              {/* Re-open modal button if result already fetched */}
              {result?.success && !showModal && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(true)}
                  className="w-full rounded-xl h-10 border-teal-200 text-teal-700 hover:bg-teal-50 text-sm font-semibold"
                >
                  <ArrowRight className="h-4 w-4 mr-1.5" /> Ver resultados de nuevo
                </Button>
              )}
            </form>
          </div>

          {/* Footer tips */}
          <p className="text-center text-xs text-slate-400 leading-relaxed">
            ¿Necesitas ayuda? Comunícate con la institución de salud directamente.<br />
            Tu información está protegida bajo la Ley 1581 de 2012. 🔒
          </p>

        </div>
      </main>

      {/* Modal */}
      {showModal && result?.success && (
        <ResultModal
          result={result}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

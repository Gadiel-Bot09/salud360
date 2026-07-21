'use client'

import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Eraser, PenLine, CheckCircle2 } from 'lucide-react'

interface SignaturePadProps {
  name: string
  required?: boolean
  brandColors?: { primary: string }
}

export function SignaturePad({ name, required, brandColors }: SignaturePadProps) {
  const padRef     = useRef<SignatureCanvas>(null)
  const [dataUrl, setDataUrl] = useState('')   // persists the PNG
  const [signed, setSigned]   = useState(false) // true = show <img>, hide canvas

  const primary     = brandColors?.primary || '#0f766e'
  const borderColor = `${primary}40`

  // ── Capture when user lifts pen/finger ────────────────────────────────────
  const handleEnd = () => {
    if (!padRef.current || padRef.current.isEmpty()) return
    const url = padRef.current.getTrimmedCanvas().toDataURL('image/png')
    setDataUrl(url)
    setSigned(true) // switch to <img> view immediately
  }

  // ── Clear ─────────────────────────────────────────────────────────────────
  const clear = () => {
    padRef.current?.clear()
    setDataUrl('')
    setSigned(false)
  }

  // ── Native HTML5 validation ───────────────────────────────────────────────
  useEffect(() => {
    const input = document.getElementById(`hidden-sig-${name}`) as HTMLInputElement | null
    if (!input) return
    input.setCustomValidity(required && !dataUrl ? 'Por favor, dibuje su firma antes de enviar.' : '')
  }, [dataUrl, required, name])

  const handleInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
    if (required && !dataUrl) e.target.setCustomValidity('Por favor, dibuje su firma antes de enviar.')
  }

  return (
    <div className="w-full flex flex-col gap-2">

      {/* ── Canvas wrapper (hidden once signed) ───────────────────────── */}
      <div
        className={`relative w-full rounded-lg border-2 border-dashed bg-slate-50 overflow-hidden transition-all ${signed ? 'hidden' : 'block'}`}
        style={{ borderColor }}
      >
        <SignatureCanvas
          ref={padRef}
          penColor="#0f172a"
          canvasProps={{
            className: 'w-full touch-none select-none',
            style: { width: '100%', height: '160px', display: 'block' },
          }}
          onEnd={handleEnd}
        />
        {/* Placeholder text */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-1">
          <PenLine className="w-6 h-6 text-slate-200" />
          <span className="text-slate-300 select-none text-sm font-medium">Dibuje su firma aquí</span>
          <span className="text-slate-200 select-none text-xs">Toque y arrastre para firmar</span>
        </div>
      </div>

      {/* ── Signature preview (shown once signed, never affected by resize) ── */}
      {signed && dataUrl && (
        <div
          className="relative w-full rounded-lg border-2 bg-white overflow-hidden"
          style={{ borderColor: primary, minHeight: '160px' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt="Firma capturada"
            className="w-full object-contain"
            style={{ maxHeight: '200px', minHeight: '160px' }}
          />
          {/* Badge */}
          <div
            className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow"
            style={{ background: primary }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Firma capturada
          </div>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          className="text-xs text-slate-500 hover:text-red-500 h-8"
        >
          <Eraser className="w-3 h-3 mr-1" />
          {signed ? 'Volver a firmar' : 'Limpiar firma'}
        </Button>
      </div>

      {/* ── Hidden input that carries the value ───────────────────────── */}
      <input
        type="hidden"
        id={`hidden-sig-${name}`}
        name={name}
        value={dataUrl}
        required={required}
        onInvalid={handleInvalid}
        onChange={() => {}}
      />
    </div>
  )
}

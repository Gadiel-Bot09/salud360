'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, PenLine, CheckCircle2, RotateCcw } from 'lucide-react'

interface SignaturePadProps {
  name: string
  required?: boolean
  brandColors?: { primary: string }
}

// ─── Internal canvas dimensions (fixed, prevents resize clearing) ─────────────
const CANVAS_W = 800
const CANVAS_H = 240

export function SignaturePad({ name, required, brandColors }: SignaturePadProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const drawing    = useRef(false)
  const hasStrokes = useRef(false)          // tracks if anything was drawn

  const [capturedUrl, setCapturedUrl] = useState<string>('')  // persists as img
  const [isSigned, setIsSigned]       = useState(false)       // swap canvas→img

  const primary = brandColors?.primary || '#0f766e'

  // ── Drawing helpers ──────────────────────────────────────────────────────
  const getXY = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (e.clientY - rect.top)  * (CANVAS_H / rect.height),
    }
  }

  const applyStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.strokeStyle = '#0f172a'
  }

  // ── Pointer handlers (works on mouse + touch + stylus uniformly) ──────────
  const onDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()                          // block scroll while drawing
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    applyStyle(ctx)
    const { x, y } = getXY(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const onMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext('2d')!
    applyStyle(ctx)
    const { x, y } = getXY(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasStrokes.current = true
  }, [])

  const onUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    if (!hasStrokes.current) return           // tap with no drawing = ignore
    // Capture as PNG and immediately switch to <img>
    const url = canvasRef.current!.toDataURL('image/png')
    setCapturedUrl(url)
    setIsSigned(true)
  }, [])

  // ── Clear ────────────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d')!.clearRect(0, 0, CANVAS_W, CANVAS_H)
    hasStrokes.current = false
    setCapturedUrl('')
    setIsSigned(false)
  }, [])

  // ── HTML5 validation ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = document.getElementById(`hsig-${name}`) as HTMLInputElement | null
    if (!el) return
    el.setCustomValidity(required && !capturedUrl ? 'Por favor dibuje su firma.' : '')
  }, [capturedUrl, required, name])

  return (
    <div className="w-full space-y-2">

      {/* ── Canvas (shown while unsigned) ──────────────────────────────── */}
      <div
        className="relative w-full rounded-xl overflow-hidden border-2 border-dashed transition-colors"
        style={{
          borderColor: primary + '55',
          display: isSigned ? 'none' : 'block',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full bg-slate-50"
          style={{
            height: '160px',
            display: 'block',
            cursor: 'crosshair',
            touchAction: 'none',   // prevent ANY native touch behavior (scroll/zoom)
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}   // finger lifted outside element
        />

        {/* Placeholder */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-2 select-none">
          <PenLine className="w-7 h-7 text-slate-200" />
          <span className="text-slate-300 text-sm font-medium">Dibuje su firma aquí</span>
          <span className="text-slate-200 text-xs">Toque y arrastre para firmar</span>
        </div>
      </div>

      {/* ── Captured image (shown after signing — immune to scroll/resize) ── */}
      {isSigned && capturedUrl && (
        <div
          className="relative w-full rounded-xl overflow-hidden border-2 bg-white"
          style={{ borderColor: primary, minHeight: '120px' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capturedUrl}
            alt="Firma capturada"
            draggable={false}
            className="w-full object-contain select-none"
            style={{ maxHeight: '200px', minHeight: '120px', display: 'block' }}
          />
          {/* Status badge */}
          <div
            className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-md"
            style={{ background: primary }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Firma capturada
          </div>
        </div>
      )}

      {/* ── Action button ─────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          className="text-xs text-slate-500 hover:text-red-500 h-8 gap-1"
        >
          {isSigned
            ? <><RotateCcw className="w-3 h-3" /> Volver a firmar</>
            : <><Eraser    className="w-3 h-3" /> Limpiar</>
          }
        </Button>
      </div>

      {/* ── Hidden input ──────────────────────────────────────────────── */}
      <input
        id={`hsig-${name}`}
        type="hidden"
        name={name}
        value={capturedUrl}
        required={required}
        onInvalid={e => {
          if (required && !capturedUrl)
            (e.target as HTMLInputElement).setCustomValidity('Por favor dibuje su firma.')
        }}
        onChange={() => {}}
      />
    </div>
  )
}

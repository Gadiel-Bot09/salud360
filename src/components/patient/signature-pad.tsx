'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Eraser, CheckCircle2 } from 'lucide-react'

interface SignaturePadProps {
  name: string
  required?: boolean
  brandColors?: { primary: string }
}

export function SignaturePad({ name, required, brandColors }: SignaturePadProps) {
  const padRef       = useRef<SignatureCanvas>(null)
  const wrapperRef   = useRef<HTMLDivElement>(null)
  const [dataUrl, setDataUrl]   = useState('')
  const [isEmpty, setIsEmpty]   = useState(true)

  // ── Restore the signature onto the canvas after any resize ─────────────────
  const restoreSignature = useCallback((url: string) => {
    if (!url || !padRef.current) return
    const canvas = padRef.current.getCanvas()
    const ctx    = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      // Clear first so we don't stack images
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = url
  }, [])

  // ── Resize Observer: when the wrapper changes size, fix canvas dims and restore ─
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const observer = new ResizeObserver(() => {
      const canvas = padRef.current?.getCanvas()
      if (!canvas) return

      // Get the true pixel dimensions from the wrapper
      const rect = wrapper.getBoundingClientRect()
      const dpr  = window.devicePixelRatio || 1

      // Only update if size actually changed (avoid infinite loops)
      if (canvas.width !== Math.round(rect.width * dpr)) {
        canvas.width  = Math.round(rect.width * dpr)
        canvas.height = Math.round(160 * dpr)

        const ctx = canvas.getContext('2d')
        if (ctx) ctx.scale(dpr, dpr)

        // If we had a saved signature, put it back
        if (dataUrl) {
          restoreSignature(dataUrl)
        }
      }
    })

    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [dataUrl, restoreSignature])

  // ── Capture signature end ─────────────────────────────────────────────────
  const handleEnd = () => {
    if (!padRef.current) return
    if (padRef.current.isEmpty()) {
      setIsEmpty(true)
      setDataUrl('')
    } else {
      setIsEmpty(false)
      const url = padRef.current.getTrimmedCanvas().toDataURL('image/png')
      setDataUrl(url)
    }
  }

  // ── Clear ─────────────────────────────────────────────────────────────────
  const clear = () => {
    padRef.current?.clear()
    setIsEmpty(true)
    setDataUrl('')
  }

  // ── HTML5 native validation ───────────────────────────────────────────────
  useEffect(() => {
    const input = document.getElementById(`hidden-sig-${name}`) as HTMLInputElement | null
    if (input) input.setCustomValidity(required && isEmpty ? 'Por favor, dibuje su firma antes de enviar.' : '')
  }, [isEmpty, required, name])

  const handleInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
    if (required && isEmpty) e.target.setCustomValidity('Por favor, dibuje su firma antes de enviar.')
  }

  const borderColor = brandColors?.primary ? `${brandColors.primary}40` : '#e2e8f0'
  const focusColor  = brandColors?.primary ? brandColors.primary : '#0f766e'

  return (
    <div className="w-full flex flex-col gap-2">
      <div
        ref={wrapperRef}
        className={`relative w-full rounded-lg border-2 bg-slate-50 overflow-hidden transition-colors ${isEmpty ? 'border-dashed' : 'border-solid'}`}
        style={{ borderColor: isEmpty ? borderColor : focusColor }}
      >
        <SignatureCanvas
          ref={padRef}
          penColor="#0f172a"
          canvasProps={{
            // touch-none prevents the page from scrolling while drawing
            className: 'w-full cursor-crosshair touch-none select-none',
            style: { width: '100%', height: '160px', display: 'block' },
          }}
          onEnd={handleEnd}
        />

        {/* Placeholder */}
        {isEmpty && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-1">
            <span className="text-slate-300 select-none text-sm font-medium">Dibuje su firma aquí</span>
            <span className="text-slate-200 select-none text-xs">↕ Toque y arrastre</span>
          </div>
        )}

        {/* Saved indicator */}
        {!isEmpty && (
          <div
            className="absolute top-1.5 right-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
            style={{ background: focusColor }}
          >
            <CheckCircle2 className="w-3 h-3" />
            Guardada
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          className="text-xs text-slate-500 hover:text-red-500 h-8"
        >
          <Eraser className="w-3 h-3 mr-1" />
          Limpiar firma
        </Button>
      </div>

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

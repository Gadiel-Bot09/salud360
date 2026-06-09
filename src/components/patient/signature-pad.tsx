'use client'

import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Eraser } from 'lucide-react'

interface SignaturePadProps {
  name: string
  required?: boolean
  brandColors?: { primary: string }
}

export function SignaturePad({ name, required, brandColors }: SignaturePadProps) {
  const padRef = useRef<SignatureCanvas>(null)
  const [dataUrl, setDataUrl] = useState('')
  const [isEmpty, setIsEmpty] = useState(true)

  // Ocultar error nativo si está lleno
  useEffect(() => {
    if (!isEmpty && padRef.current) {
      const input = document.getElementById(`hidden-sig-${name}`) as HTMLInputElement
      if (input) input.setCustomValidity('')
    }
  }, [isEmpty, name])

  const handleEnd = () => {
    if (padRef.current) {
      if (padRef.current.isEmpty()) {
        setIsEmpty(true)
        setDataUrl('')
      } else {
        setIsEmpty(false)
        setDataUrl(padRef.current.getTrimmedCanvas().toDataURL('image/png'))
      }
    }
  }

  const clear = () => {
    if (padRef.current) {
      padRef.current.clear()
      setIsEmpty(true)
      setDataUrl('')
    }
  }

  // Validación nativa HTML5
  const handleInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
    if (required && isEmpty) {
      e.target.setCustomValidity('Por favor, dibuje su firma antes de enviar.')
    }
  }

  const borderColor = brandColors?.primary ? `${brandColors.primary}40` : '#e2e8f0'
  const focusColor = brandColors?.primary ? brandColors.primary : '#0f766e'

  return (
    <div className="w-full flex flex-col gap-2">
      <div 
        className={`relative w-full rounded-lg border-2 border-dashed bg-slate-50 overflow-hidden transition-colors ${isEmpty ? '' : 'border-solid'}`}
        style={{ borderColor: isEmpty ? borderColor : focusColor }}
      >
        <SignatureCanvas
          ref={padRef}
          penColor="#0f172a"
          canvasProps={{
            className: 'w-full h-40 cursor-crosshair touch-none',
            style: { width: '100%', height: '160px' }
          }}
          onEnd={handleEnd}
        />
        
        {isEmpty && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="text-slate-300 select-none text-sm font-medium">Dibuje su firma aquí</span>
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

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Download, QrCode, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  portalUrl: string
  institutionName: string
  primaryColor: string
  secondaryColor: string
  logoUrl?: string | null
}

/**
 * Generates a fully branded QR code for the patient portal using Canvas API.
 * - Custom foreground color from institution primary color
 * - Logo centered in the QR (error correction L = 7%, so we can use up to ~20% logo area safely at M level)
 * - Downloadable as PNG
 */
export function PortalQRCode({
  portalUrl,
  institutionName,
  primaryColor,
  secondaryColor,
  logoUrl,
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading]   = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const generateQR = useCallback(async () => {
    if (!canvasRef.current) return
    setLoading(true)
    setError(null)

    try {
      // Dynamically import qrcode (client-only)
      const QRCode = (await import('qrcode')).default

      const SIZE        = 512
      const LOGO_RATIO  = 0.22   // logo takes 22% of QR width
      const PADDING     = 32     // px of white padding around QR
      const CORNER_R    = 24     // canvas border radius (drawn manually)

      // ── Step 1: Draw QR onto an offscreen canvas ─────────────────────────
      const offscreen = document.createElement('canvas')
      offscreen.width  = SIZE
      offscreen.height = SIZE

      await QRCode.toCanvas(offscreen, portalUrl, {
        width:  SIZE,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark:  primaryColor.startsWith('#') ? primaryColor : `#${primaryColor}`,
          light: '#ffffff',
        },
      })

      // ── Step 2: Compose onto main canvas with padding + rounded corners ──
      const canvas = canvasRef.current
      const TOTAL   = SIZE + PADDING * 2
      canvas.width  = TOTAL
      canvas.height = TOTAL + 64 // extra space for institution name

      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background card
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, 0, 0, canvas.width, canvas.height, CORNER_R)
      ctx.fill()

      // Subtle top gradient band using secondary color
      const grad = ctx.createLinearGradient(0, 0, canvas.width, 0)
      grad.addColorStop(0, hexToRgba(secondaryColor, 0.08))
      grad.addColorStop(1, hexToRgba(primaryColor,   0.08))
      ctx.fillStyle = grad
      roundRect(ctx, 0, 0, canvas.width, 12, { tl: CORNER_R, tr: CORNER_R, bl: 0, br: 0 })
      ctx.fill()

      // Draw QR image with padding
      ctx.drawImage(offscreen, PADDING, PADDING, SIZE, SIZE)

      // ── Step 3: Draw logo in center if available ────────────────────────
      if (logoUrl && !logoUrl.startsWith('blob:')) {
        await drawLogo(ctx, logoUrl, PADDING, PADDING, SIZE, LOGO_RATIO)
      }

      // ── Step 4: Draw institution name at bottom ─────────────────────────
      const textY = SIZE + PADDING + 20
      ctx.fillStyle = primaryColor.startsWith('#') ? primaryColor : `#${primaryColor}`
      ctx.font      = 'bold 18px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        institutionName.length > 38 ? institutionName.substring(0, 36) + '…' : institutionName,
        canvas.width / 2,
        textY
      )

      // Small label
      ctx.fillStyle = '#94a3b8'
      ctx.font      = '13px system-ui, -apple-system, sans-serif'
      ctx.fillText('Portal de Pacientes · Salud360', canvas.width / 2, textY + 22)

      setGenerated(true)
    } catch (err: any) {
      console.error('QR generation error:', err)
      setError('No se pudo generar el código QR. ' + (err?.message || ''))
    } finally {
      setLoading(false)
    }
  }, [portalUrl, primaryColor, secondaryColor, logoUrl, institutionName])

  // Auto-generate on first render
  useEffect(() => { generateQR() }, [generateQR])

  const handleDownload = () => {
    if (!canvasRef.current || !generated) return
    const link      = document.createElement('a')
    link.download   = `qr-portal-${institutionName.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href       = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Canvas preview */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
        {(loading || !generated) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 rounded-2xl">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              <span className="text-xs">Generando QR…</span>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="max-w-[280px] w-full"
          style={{ display: generated ? 'block' : 'none' }}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 text-center max-w-xs">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={generateQR}
          disabled={loading}
          className="text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Regenerar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleDownload}
          disabled={!generated || loading}
          className="text-xs bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Descargar PNG
        </Button>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  radius: number | { tl: number; tr: number; bl: number; br: number }
) {
  const r = typeof radius === 'number'
    ? { tl: radius, tr: radius, bl: radius, br: radius }
    : radius
  ctx.beginPath()
  ctx.moveTo(x + r.tl, y)
  ctx.lineTo(x + w - r.tr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr)
  ctx.lineTo(x + w, y + h - r.br)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h)
  ctx.lineTo(x + r.bl, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl)
  ctx.lineTo(x, y + r.tl)
  ctx.quadraticCurveTo(x, y, x + r.tl, y)
  ctx.closePath()
}

async function drawLogo(
  ctx: CanvasRenderingContext2D,
  logoUrl: string,
  qrX: number, qrY: number, qrSize: number,
  ratio: number
) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const logoSize   = qrSize * ratio
      const centerX    = qrX + qrSize / 2
      const centerY    = qrY + qrSize / 2
      const logoLeft   = centerX - logoSize / 2
      const logoTop    = centerY - logoSize / 2
      const padding    = 8
      const bgSize     = logoSize + padding * 2
      const bgLeft     = logoLeft - padding
      const bgTop      = logoTop  - padding

      // White circle background for logo
      ctx.save()
      ctx.shadowColor   = 'rgba(0,0,0,0.15)'
      ctx.shadowBlur    = 12
      ctx.fillStyle     = '#ffffff'
      ctx.beginPath()
      ctx.arc(centerX, centerY, bgSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Draw logo clipped to circle
      ctx.save()
      ctx.beginPath()
      ctx.arc(centerX, centerY, logoSize / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, logoLeft, logoTop, logoSize, logoSize)
      ctx.restore()

      resolve()
    }
    img.onerror = () => resolve() // silently skip if logo fails to load
    img.src = logoUrl
  })
}

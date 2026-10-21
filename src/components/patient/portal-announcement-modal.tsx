'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileCheck, Check, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react'

export interface PortalAnnouncementData {
  enabled?: boolean
  show_modal?: boolean
  title?: string
  message?: string
  documents?: string[]
}

interface Props {
  announcement?: PortalAnnouncementData | null
  institutionName?: string
  primaryColor?: string
}

export function PortalAnnouncementModal({
  announcement,
  institutionName,
  primaryColor = '#0f766e',
}: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Only open if announcement is active, show_modal is true (or undefined/not explicitly false), and has documents
    if (
      announcement &&
      announcement.enabled !== false &&
      announcement.show_modal !== false &&
      Array.isArray(announcement.documents) &&
      announcement.documents.length > 0
    ) {
      const timer = setTimeout(() => {
        setOpen(true)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [announcement])

  if (!announcement || announcement.enabled === false || announcement.show_modal === false) {
    return null
  }

  const documents = announcement.documents || []
  if (documents.length === 0) {
    return null
  }

  const title = announcement.title || 'Documentos requeridos antes de radicar'
  const message =
    announcement.message ||
    'Ten a la mano los siguientes soportes para agilizar la gestión de tu solicitud:'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md w-[92vw] max-w-[460px] p-0 overflow-hidden rounded-3xl border border-slate-100 shadow-2xl bg-white">
        {/* Top Decorative Header Accent */}
        <div
          className="h-2.5 w-full"
          style={{
            background: `linear-gradient(90deg, ${primaryColor}, #14b8a6, ${primaryColor})`,
          }}
        />

        <div className="p-6 sm:p-7">
          <DialogHeader className="text-center sm:text-center items-center">
            {/* Medical Document Icon Badge */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-md transition-transform hover:scale-105"
              style={{
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
            >
              <FileCheck className="w-7 h-7" style={{ color: primaryColor }} />
            </div>

            {institutionName && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {institutionName}
              </span>
            )}

            <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
              {title}
            </DialogTitle>

            {message && (
              <DialogDescription className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed max-w-sm">
                {message}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Documents Checklist Card */}
          <div className="mt-5 space-y-2 bg-slate-50/90 rounded-2xl p-3.5 border border-slate-100">
            {documents.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/60 shadow-2xs transition-all hover:border-slate-300"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${primaryColor}18`,
                  }}
                >
                  <Check
                    className="w-3.5 h-3.5 stroke-[3]"
                    style={{ color: primaryColor }}
                  />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                  {doc}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Informative Note */}
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50/70 border border-teal-100/80 text-[11px] text-teal-800">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Formatos aceptados: PDF, JPG o PNG. Deben ser claros y legibles.</span>
          </div>

          {/* Action CTA Button */}
          <div className="mt-5 pt-1">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-5 rounded-2xl text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:opacity-95 active:scale-[0.99] flex items-center justify-center gap-2"
              style={{
                backgroundColor: primaryColor,
              }}
            >
              <span>¡Entendido, tengo mis documentos!</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

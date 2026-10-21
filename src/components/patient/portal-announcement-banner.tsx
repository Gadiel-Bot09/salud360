import { FileCheck, Check } from 'lucide-react'

export interface PortalAnnouncement {
  enabled?: boolean
  show_modal?: boolean
  title?: string
  message?: string
  documents?: string[]
}

interface Props {
  announcement?: PortalAnnouncement | null
  primaryColor?: string
}

export function PortalAnnouncementBanner({ announcement, primaryColor = '#0f766e' }: Props) {
  if (!announcement || announcement.enabled === false) {
    return null
  }

  const documents = announcement.documents || []
  if (documents.length === 0) {
    return null
  }

  const title = announcement.title || 'Documentos requeridos antes de radicar'
  const message = announcement.message || 'Ten a la mano los siguientes soportes para agilizar la gestión de tu solicitud:'

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 px-2 sm:px-0">
      <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 sm:p-5 shadow-xl text-left relative overflow-hidden transition-all hover:bg-white/20">
        {/* Subtle accent highlight line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-300 via-white to-teal-300 opacity-60" />

        <div className="flex items-center gap-2.5 mb-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-white/25 text-white shrink-0 shadow-sm">
            <FileCheck className="w-4 h-4 text-white" />
          </span>
          <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase drop-shadow-xs">
            {title}
          </h3>
        </div>

        {message && (
          <p className="text-xs text-white/90 leading-relaxed mb-3 font-normal drop-shadow-2xs">
            {message}
          </p>
        )}

        {/* Document Tags */}
        <div className="flex flex-wrap gap-2 pt-0.5">
          {documents.map((doc, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/95 text-slate-800 shadow-md transition-transform hover:scale-105"
            >
              <span className="w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-teal-700 stroke-[3]" />
              </span>
              <span>{doc}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useTransition, useState } from 'react'
import { Wrench, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { togglePortalMaintenance, setAllInstitutionsMaintenance } from '@/app/admin/settings/actions'

interface InstitutionMaintenance {
  id: string
  name: string
  slug: string | null
  portal_maintenance: boolean
  maintenance_message: string | null
}

interface Props {
  isSuper: boolean
  institution?: {
    id: string
    name: string
    portal_maintenance: boolean
    maintenance_message: string | null
  } | null
  allInstitutions?: InstitutionMaintenance[]
}

type Feedback = { type: 'success' | 'error'; msg: string } | null

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  return (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
      feedback.type === 'success'
        ? 'bg-teal-50 border border-teal-200 text-teal-700'
        : 'bg-red-50 border border-red-200 text-red-700'
    }`}>
      {feedback.type === 'success'
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0" />}
      {feedback.msg}
    </div>
  )
}

function SingleMaintenanceForm({ institution }: {
  institution: NonNullable<Props['institution']>
}) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback]     = useState<Feedback>(null)
  const [isActive, setIsActive]     = useState(institution.portal_maintenance)
  const [message, setMessage]       = useState(institution.maintenance_message || '')

  function show(f: Feedback) { setFeedback(f); setTimeout(() => setFeedback(null), 5000) }

  function handleToggle(newActive: boolean) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('institutionId', institution.id)
      fd.set('active', String(newActive))
      fd.set('message', message)
      const res = await togglePortalMaintenance(fd)
      if (res.success) {
        setIsActive(newActive)
        show({ type: 'success', msg: newActive ? '🔧 Portal puesto en mantenimiento correctamente.' : '✅ Portal activado. Los pacientes ya pueden acceder.' })
      } else {
        show({ type: 'error', msg: res.error || 'Error al actualizar.' })
      }
    })
  }

  function handleSaveMessage() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('institutionId', institution.id)
      fd.set('active', String(isActive))
      fd.set('message', message)
      const res = await togglePortalMaintenance(fd)
      if (res.success) {
        show({ type: 'success', msg: '💬 Mensaje guardado correctamente.' })
      } else {
        show({ type: 'error', msg: res.error || 'Error al guardar el mensaje.' })
      }
    })
  }

  return (
    <div className="space-y-4">
      <FeedbackBanner feedback={feedback} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-800 text-sm">{institution.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Estado actual:{' '}
            {isActive
              ? <span className="text-red-600 font-semibold">🔴 En mantenimiento</span>
              : <span className="text-teal-600 font-semibold">🟢 Portal activo</span>}
          </p>
        </div>
        {pending
          ? <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-sm font-semibold flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</div>
          : isActive
            ? <button onClick={() => handleToggle(false)} className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors">✅ Activar Portal</button>
            : <button onClick={() => handleToggle(true)} className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors flex items-center gap-2"><Wrench className="w-4 h-4" /> Poner en Mantenimiento</button>
        }
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Mensaje personalizado para los pacientes (opcional)</label>
        <textarea
          rows={2}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Estamos realizando mejoras para brindarte una mejor experiencia. Por favor intenta más tarde."
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          onClick={handleSaveMessage}
          disabled={pending}
          className="mt-2 text-xs text-teal-700 hover:text-teal-900 underline underline-offset-2 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Guardando...' : 'Guardar mensaje sin cambiar el estado'}
        </button>
      </div>
    </div>
  )
}

function SuperAdminMaintenanceList({ institutions }: { institutions: InstitutionMaintenance[] }) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback]     = useState<Feedback>(null)
  const [statuses, setStatuses]     = useState<Record<string, boolean>>(
    Object.fromEntries(institutions.map(i => [i.id, i.portal_maintenance]))
  )
  const [loadingId, setLoadingId]   = useState<string | null>(null)

  function show(f: Feedback) { setFeedback(f); setTimeout(() => setFeedback(null), 5000) }

  function handleToggleOne(inst: InstitutionMaintenance, newActive: boolean) {
    setLoadingId(inst.id)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('institutionId', inst.id)
      fd.set('active', String(newActive))
      const res = await togglePortalMaintenance(fd)
      if (res.success) {
        setStatuses(prev => ({ ...prev, [inst.id]: newActive }))
        show({ type: 'success', msg: newActive ? `🔧 "${inst.name}" en mantenimiento.` : `✅ Portal de "${inst.name}" activado.` })
      } else {
        show({ type: 'error', msg: res.error || 'Error al actualizar.' })
      }
      setLoadingId(null)
    })
  }

  function handleGlobal(newActive: boolean) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('active', String(newActive))
      const res = await setAllInstitutionsMaintenance(fd)
      if (res.success) {
        setStatuses(Object.fromEntries(institutions.map(i => [i.id, newActive])))
        show({ type: 'success', msg: newActive ? '🔧 Todos los portales puestos en mantenimiento.' : '✅ Todos los portales activados.' })
      } else {
        show({ type: 'error', msg: res.error || 'Error al actualizar.' })
      }
    })
  }

  return (
    <div className="space-y-5">
      <FeedbackBanner feedback={feedback} />
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => handleGlobal(true)} disabled={pending} className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} 🔧 Poner TODAS en mantenimiento
        </button>
        <button onClick={() => handleGlobal(false)} disabled={pending} className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} ✅ Activar TODOS los portales
        </button>
      </div>
      <div className="border-t border-slate-100 pt-4 space-y-3">
        {institutions.map(inst => {
          const isOn    = statuses[inst.id] ?? inst.portal_maintenance
          const loading = loadingId === inst.id && pending
          return (
            <div key={inst.id} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{inst.name}</p>
                <p className="text-xs text-slate-400">{inst.slug ? `/${inst.slug}` : 'sin slug'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isOn ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'}`}>
                  {isOn ? '🔴 Mantenimiento' : '🟢 Activo'}
                </span>
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  : isOn
                    ? <button onClick={() => handleToggleOne(inst, false)} disabled={pending} className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors">Activar</button>
                    : <button onClick={() => handleToggleOne(inst, true)} disabled={pending} className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors">Mantenimiento</button>
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MaintenanceModeSection({ isSuper, institution, allInstitutions = [] }: Props) {
  return (
    <div>
      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
        <Wrench className="w-4 h-4" /> Modo Mantenimiento del Portal
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Cuando el portal está en mantenimiento, los pacientes ven una pantalla de aviso en lugar del formulario de solicitudes.
      </p>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {!isSuper && institution && <SingleMaintenanceForm institution={institution} />}
        {isSuper && <SuperAdminMaintenanceList institutions={allInstitutions} />}
      </div>
    </div>
  )
}

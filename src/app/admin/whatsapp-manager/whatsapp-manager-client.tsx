'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Smartphone, QrCode, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

interface Institution {
  id: string
  name: string
  evolution_connected: boolean
  evolution_instance_name: string | null
}

interface Props {
  institution: Institution
  initialConnected: boolean
  userRole: string
}

export function WhatsAppManagerClient({ institution, initialConnected, userRole }: Props) {
  const [status, setStatus] = useState<'checking' | 'idle' | 'loading' | 'qr_ready' | 'connected'>(
    initialConnected ? 'connected' : 'idle'
  )
  const [qrBase64, setQrBase64]         = useState<string | null>(null)
  const [instanceName, setInstanceName] = useState<string | null>(institution.evolution_instance_name)
  const [phoneNumber, setPhoneNumber]   = useState<string | null>(null)
  const [testPhone, setTestPhone]       = useState('')
  const [sending, setSending]           = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Verificar estado real al montar (silencioso)
  useEffect(() => {
    if (!initialConnected && institution.evolution_instance_name) {
      checkStatus(institution.evolution_instance_name, true)
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkStatus = async (iName: string, silent = false) => {
    if (!iName) return
    if (!silent) setStatus('checking')
    try {
      const res  = await fetch('/api/evolution/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId: institution.id, instanceName: iName })
      })
      const data = await res.json()
      if (data.connected) {
        setStatus('connected')
        setQrBase64(null)
        if (data.phoneNumber) setPhoneNumber(data.phoneNumber)
        if (pollingRef.current) clearInterval(pollingRef.current)
      } else {
        if (!silent) setStatus('idle')
      }
    } catch {
      if (!silent) setStatus('idle')
    }
  }

  const handleConnect = async () => {
    setStatus('loading')
    try {
      const res  = await fetch('/api/evolution/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId: institution.id })
      })
      const data = await res.json()

      if (data.alreadyConnected) {
        setInstanceName(data.instanceName)
        setStatus('connected')
        toast({ title: '¡Conectado!', description: 'WhatsApp ya estaba vinculado.' })
        return
      }

      if (data.success && data.base64) {
        setQrBase64(data.base64)
        setInstanceName(data.instanceName)
        setStatus('qr_ready')
        startPolling(data.instanceName)
      } else {
        toast({ title: 'Error', description: data.error || 'No se pudo generar QR', variant: 'destructive' })
        setStatus('idle')
      }
    } catch (err: any) {
      setStatus('idle')
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleForceSync = async () => {
    if (!instanceName) return
    setStatus('checking')
    try {
      const res  = await fetch('/api/evolution/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId: institution.id, instanceName })
      })
      const data = await res.json()
      if (data.connected) {
        setStatus('connected')
        toast({ title: '✅ Conectado', description: 'Estado sincronizado con Evolution API.' })
      } else {
        setStatus('idle')
        toast({ title: 'No conectado', description: `Estado: "${data.state || 'desconocido'}"`, variant: 'destructive' })
      }
    } catch (err: any) {
      setStatus('idle')
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const startPolling = (iName: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      const res  = await fetch('/api/evolution/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId: institution.id, instanceName: iName })
      })
      const data = await res.json()
      if (data.connected) {
        setStatus('connected')
        setQrBase64(null)
        if (data.phoneNumber) setPhoneNumber(data.phoneNumber)
        if (pollingRef.current) clearInterval(pollingRef.current)
        toast({ title: '¡WhatsApp Vinculado!', description: 'El sistema ya puede enviar recordatorios.' })
      }
    }, 3000)
  }

  const handleTestSend = async () => {
    if (!testPhone || !instanceName) return
    setSending(true)
    try {
      const res = await fetch('/api/evolution/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId: institution.id, instanceName, phone: testPhone })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: '✅ Mensaje enviado', description: `WhatsApp de prueba enviado a ${testPhone}` })
      } else {
        toast({ title: 'Error al enviar', description: data.error || 'Sin detalles', variant: 'destructive' })
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Panel principal */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <Smartphone className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800">Estado de la conexión</h3>
            <p className="text-xs text-slate-500">Instancia: <span className="font-mono">{instanceName || '—'}</span></p>
          </div>
          {instanceName && status !== 'loading' && (
            <button
              type="button"
              onClick={() => checkStatus(instanceName)}
              className="text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${status === 'checking' ? 'animate-spin text-teal-500' : ''}`} />
              Verificar
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Cargando / Verificando */}
          {(status === 'checking' || status === 'loading') && (
            <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
              <span className="text-sm">{status === 'checking' ? 'Verificando estado...' : 'Procesando...'}</span>
            </div>
          )}

          {/* Conectado */}
          {status === 'connected' && (
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-green-50 border border-green-200 p-5 rounded-xl">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold text-green-800">✅ WhatsApp Conectado</p>
                <p className="text-sm text-green-700 mt-1">El sistema está enviando recordatorios y notificaciones correctamente.</p>
                {phoneNumber && <p className="text-xs font-mono text-green-600 mt-1">📱 {phoneNumber}</p>}
              </div>
            </div>
          )}

          {/* QR listo para escanear */}
          {status === 'qr_ready' && (
            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Abre WhatsApp → <strong>Dispositivos vinculados</strong> → Escanea este código</span>
              </div>
              <img src={qrBase64!} alt="QR Code" className="w-52 h-52 mx-auto border-2 border-slate-200 rounded-xl shadow-sm" />
              <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Esperando escaneo... (el código expira en 60 segundos)
              </p>
            </div>
          )}

          {/* Sin conexión */}
          {status === 'idle' && (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <QrCode className="h-8 w-8 text-slate-300" />
              </div>
              <div>
                <p className="font-medium text-slate-700">WhatsApp no conectado</p>
                <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                  Genera el código QR y escanéalo con el celular de la institución para activar los recordatorios automáticos.
                </p>
              </div>
              <Button onClick={handleConnect} className="bg-green-600 hover:bg-green-700 gap-2">
                <QrCode className="h-4 w-4" />
                Generar Código QR
              </Button>
              {instanceName && (
                <div className="pt-3 border-t border-slate-100">
                  <button type="button" onClick={handleForceSync}
                    className="text-xs font-medium text-teal-600 hover:underline flex items-center gap-1 mx-auto">
                    <RefreshCw className="h-3 w-3" /> Forzar sincronización con Evolution API
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Panel de prueba — solo si hay instancia y está conectado/idle */}
      {instanceName && status !== 'loading' && status !== 'qr_ready' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <h4 className="font-semibold text-slate-700 text-sm">DIAGNÓSTICO — Envío de Prueba</h4>
          </div>
          <p className="text-sm text-slate-500 mb-3">
            Ingresa un número para enviar un mensaje de prueba y verificar que el envío funcione correctamente.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Ej: 3128287913"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              className="flex-1"
              type="tel"
            />
            <Button
              onClick={handleTestSend}
              disabled={!testPhone || sending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Probar'}
            </Button>
          </div>
        </section>
      )}

      {/* Aviso de rol */}
      {userRole === 'Gestor' && (
        <p className="text-xs text-center text-slate-400">
          Como Gestor solo puedes gestionar la conexión de WhatsApp. Los ajustes de la institución los administra el Admin.
        </p>
      )}
    </div>
  )
}

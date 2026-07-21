'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Lock, CheckCircle2, Loader2, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updatePassword } from '../actions'

export default function ResetPasswordPage() {
    const [password, setPassword]         = useState('')
    const [confirm, setConfirm]           = useState('')
    const [showPass, setShowPass]         = useState(false)
    const [showConfirm, setShowConfirm]   = useState(false)
    const [error, setError]               = useState('')
    const [success, setSuccess]           = useState(false)
    const [sessionReady, setSessionReady] = useState(false)
    const [isPending, startTransition]    = useTransition()

    // Supabase sends the token as a hash fragment (#access_token=...)
    // We need to detect the session from the URL hash on mount
    useEffect(() => {
        const supabase = createClient()
        // onAuthStateChange fires when Supabase processes the hash fragment
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setSessionReady(true)
            }
        })
        return () => subscription.unsubscribe()
    }, [])

    const strength = (() => {
        if (password.length === 0) return 0
        let s = 0
        if (password.length >= 8)  s++
        if (/[A-Z]/.test(password)) s++
        if (/[0-9]/.test(password)) s++
        if (/[^A-Za-z0-9]/.test(password)) s++
        return s
    })()

    const strengthLabel = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][strength]
    const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'][strength]

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')

        if (password !== confirm) {
            setError('Las contraseñas no coinciden.')
            return
        }
        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.')
            return
        }

        const fd = new FormData(e.currentTarget)
        startTransition(async () => {
            const result = await updatePassword(fd)
            if (result?.error) {
                setError(result.error)
            } else {
                setSuccess(true)
            }
        })
    }

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 selection:bg-teal-100 selection:text-teal-900">

            {/* ── Left brand panel ───────────────────────────────────────── */}
            <div className="hidden md:flex md:w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden text-white">
                <div className="absolute inset-0 z-0 opacity-40 mix-blend-color-dodge">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-600 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-sky-800 rounded-full blur-[120px]" />
                </div>
                <div className="relative z-10">
                    <Image src="/logo-white.svg" alt="Salud360" width={220} height={55} priority />
                </div>
                <div className="relative z-10 max-w-md">
                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                        Seguridad primero.
                    </h1>
                    <p className="text-lg text-slate-300 leading-relaxed font-light">
                        Crea una contraseña segura para proteger el acceso a la información médica de tus pacientes.
                    </p>
                </div>
                <div className="relative z-10">
                    <p className="text-sm text-slate-400">© {new Date().getFullYear()} Grupo SinuFilas Inc.</p>
                </div>
            </div>

            {/* ── Right form panel ───────────────────────────────────────── */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white/50">

                <div className="absolute top-8 left-8 flex md:hidden">
                    <Image src="/logo.svg" alt="Salud360" width={160} height={40} priority />
                </div>

                <div className="w-full max-w-md space-y-8">

                    {!success ? (
                        <>
                            <div className="space-y-3">
                                <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center">
                                    <ShieldCheck className="w-7 h-7 text-teal-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800">Nueva contraseña</h2>
                                <p className="text-slate-500 text-sm">
                                    Ingresa y confirma tu nueva contraseña. Debe tener al menos 8 caracteres.
                                </p>
                            </div>

                            {/* Session not ready warning */}
                            {!sessionReady && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-amber-800 text-sm font-semibold">Verificando enlace...</p>
                                        <p className="text-amber-700 text-xs mt-0.5">
                                            Si llegaste aquí desde el correo de recuperación, espera un momento. Si el problema persiste, solicita un nuevo enlace.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Card className="border-0 shadow-lg shadow-teal-900/5 bg-white ring-1 ring-slate-100">
                                <form onSubmit={handleSubmit}>
                                    <CardContent className="pt-8 space-y-5">

                                        {/* New password */}
                                        <div className="space-y-2">
                                            <Label htmlFor="password" className="text-slate-700 font-medium">
                                                Nueva contraseña
                                            </Label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Lock className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <Input
                                                    id="password"
                                                    name="password"
                                                    type={showPass ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                    className="pl-10 pr-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-teal-500 focus:border-teal-500 transition-colors"
                                                    required
                                                    minLength={8}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPass(v => !v)}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                                >
                                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            {/* Strength meter */}
                                            {password.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4].map(i => (
                                                            <div
                                                                key={i}
                                                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-slate-200'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        Seguridad: <strong className="text-slate-700">{strengthLabel}</strong>
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirm password */}
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm_password" className="text-slate-700 font-medium">
                                                Confirmar contraseña
                                            </Label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Lock className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <Input
                                                    id="confirm_password"
                                                    name="confirm_password"
                                                    type={showConfirm ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    value={confirm}
                                                    onChange={e => setConfirm(e.target.value)}
                                                    className="pl-10 pr-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-teal-500 focus:border-teal-500 transition-colors"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirm(v => !v)}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                                >
                                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            {/* Match indicator */}
                                            {confirm.length > 0 && (
                                                <p className={`text-xs flex items-center gap-1 ${password === confirm ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {password === confirm
                                                        ? <><CheckCircle2 className="w-3 h-3" /> Las contraseñas coinciden</>
                                                        : <>⚠ Las contraseñas no coinciden</>
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        {/* Error */}
                                        {error && (
                                            <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-lg border border-red-100 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                {error}
                                            </div>
                                        )}
                                    </CardContent>

                                    <CardFooter className="pb-8">
                                        <Button
                                            type="submit"
                                            disabled={isPending || !sessionReady}
                                            className="w-full h-12 text-[15px] font-semibold bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                                        >
                                            {isPending
                                                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Actualizando...</>
                                                : <><ShieldCheck className="w-4 h-4 mr-2" /> Actualizar contraseña</>
                                            }
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </>
                    ) : (
                        /* ── Success ── */
                        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Contraseña actualizada!</h2>
                                <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
                                    Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
                                </p>
                            </div>
                            <Link
                                href="/login"
                                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5"
                            >
                                Ir al inicio de sesión
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

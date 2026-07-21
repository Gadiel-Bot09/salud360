'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { LogIn, Lock, Mail, X, ArrowLeft, CheckCircle2, Loader2, KeyRound } from 'lucide-react'
import Image from 'next/image'
import { login, resetPassword } from './actions'

export default function LoginPage({
    searchParams,
}: {
    searchParams: { error?: string }
}) {
    const [showForgot, setShowForgot]   = useState(false)
    const [resetEmail, setResetEmail]   = useState('')
    const [resetSent, setResetSent]     = useState(false)
    const [resetError, setResetError]   = useState('')
    const [isPending, startTransition]  = useTransition()

    const handleResetSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setResetError('')
        const fd = new FormData(e.currentTarget)
        startTransition(async () => {
            const result = await resetPassword(fd)
            if (result?.error) {
                setResetError(result.error)
            } else {
                setResetSent(true)
            }
        })
    }

    const closeForgot = () => {
        setShowForgot(false)
        setResetSent(false)
        setResetError('')
        setResetEmail('')
    }

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 relative selection:bg-teal-100 selection:text-teal-900">

            {/* ── Left Side — Hero ────────────────────────────────────────── */}
            <div className="hidden md:flex md:w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden text-white">
                <div className="absolute inset-0 z-0 opacity-40 mix-blend-color-dodge">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-600 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-sky-800 rounded-full blur-[120px]" />
                </div>
                <div className="relative z-10">
                    <Image src="/logo-white.svg" alt="Salud360 Logo" width={220} height={55} priority />
                </div>
                <div className="relative z-10 max-w-md">
                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                        Eficiencia digital para centros médicos.
                    </h1>
                    <p className="text-lg text-slate-300 leading-relaxed font-light mb-8">
                        Centraliza radicados, agiliza respuestas a tus pacientes y controla múltiples instituciones de salud con las mayores herramientas corporativas en la nube.
                    </p>
                    <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-sm font-medium flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span>SaaS Edition v3.0</span>
                        </div>
                    </div>
                </div>
                <div className="relative z-10">
                    <p className="text-sm text-slate-400">© {new Date().getFullYear()} Grupo SinuFilas Inc.</p>
                </div>
            </div>

            {/* ── Right Side — Form ────────────────────────────────────────── */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white/50 backdrop-blur-3xl relative">

                {/* Mobile logo */}
                <div className="absolute top-8 left-8 flex md:hidden items-center gap-2">
                    <Image src="/logo.svg" alt="Salud360 Logo" width={160} height={40} priority />
                </div>

                <div className="w-full max-w-md space-y-8">

                    {/* ── LOGIN FORM ─────────────────────────────────────── */}
                    {!showForgot && (
                        <>
                            <div className="text-center md:text-left space-y-3">
                                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Bienvenido de vuelta</h2>
                                <p className="text-slate-500">Ingresa tus credenciales para acceder a tu consola administrativa.</p>
                            </div>

                            <Card className="border-0 shadow-lg shadow-teal-900/5 bg-white ring-1 ring-slate-100">
                                <form>
                                    <CardContent className="pt-8 space-y-5">
                                        {/* Email */}
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-slate-700 font-medium">Correo electrónico</Label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Mail className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    placeholder="admin@salud360.com"
                                                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-teal-500 focus:border-teal-500 transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="password" className="text-slate-700 font-medium">Contraseña</Label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowForgot(true)}
                                                    className="text-sm font-medium text-teal-600 hover:text-teal-500 hover:underline transition"
                                                >
                                                    ¿Olvidó su clave?
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Lock className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <Input
                                                    id="password"
                                                    name="password"
                                                    type="password"
                                                    placeholder="••••••••"
                                                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-teal-500 focus:border-teal-500 transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Error */}
                                        {searchParams?.error && (
                                            <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-lg flex items-start gap-2 border border-red-100 animate-in fade-in slide-in-from-top-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                                                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zm.453 8.247a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5zm.75 7.5a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                </svg>
                                                {searchParams.error}
                                            </div>
                                        )}
                                    </CardContent>

                                    <CardFooter className="pb-8">
                                        <Button
                                            formAction={login}
                                            className="w-full h-12 text-[15px] font-semibold bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5"
                                            type="submit"
                                        >
                                            <LogIn className="w-4 h-4 mr-2" />
                                            Acceder al Sistema
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>

                            <div className="text-center text-sm text-slate-500 border-t border-slate-200 pt-6">
                                Protegido bajo estricta confidencialidad médica.
                                <br />
                                <span className="text-slate-400 text-xs">Asegurado por Supabase Auth + RLS Layers</span>
                            </div>
                        </>
                    )}

                    {/* ── FORGOT PASSWORD PANEL ─────────────────────────── */}
                    {showForgot && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">

                            {/* Back button */}
                            <button
                                type="button"
                                onClick={closeForgot}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors mb-8 group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                Volver al inicio de sesión
                            </button>

                            {!resetSent ? (
                                <>
                                    <div className="space-y-2 mb-8">
                                        <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-4">
                                            <KeyRound className="w-7 h-7 text-teal-600" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-slate-800">Recuperar contraseña</h2>
                                        <p className="text-slate-500 text-sm leading-relaxed">
                                            Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
                                        </p>
                                    </div>

                                    <Card className="border-0 shadow-lg shadow-teal-900/5 bg-white ring-1 ring-slate-100">
                                        <form onSubmit={handleResetSubmit}>
                                            <CardContent className="pt-8 space-y-5">
                                                <div className="space-y-2">
                                                    <Label htmlFor="reset-email" className="text-slate-700 font-medium">
                                                        Correo electrónico
                                                    </Label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Mail className="h-5 w-5 text-slate-400" />
                                                        </div>
                                                        <Input
                                                            id="reset-email"
                                                            name="email"
                                                            type="email"
                                                            placeholder="admin@salud360.com"
                                                            value={resetEmail}
                                                            onChange={e => setResetEmail(e.target.value)}
                                                            className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-teal-500 focus:border-teal-500 transition-colors"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                {resetError && (
                                                    <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-lg border border-red-100 flex items-center gap-2">
                                                        <X className="w-4 h-4 shrink-0" />
                                                        {resetError}
                                                    </div>
                                                )}
                                            </CardContent>

                                            <CardFooter className="pb-8">
                                                <Button
                                                    type="submit"
                                                    disabled={isPending || !resetEmail}
                                                    className="w-full h-12 text-[15px] font-semibold bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                                                >
                                                    {isPending
                                                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                                                        : <><Mail className="w-4 h-4 mr-2" /> Enviar enlace de recuperación</>
                                                    }
                                                </Button>
                                            </CardFooter>
                                        </form>
                                    </Card>
                                </>
                            ) : (
                                /* ── Success state ── */
                                <div className="text-center space-y-6">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Correo enviado!</h2>
                                        <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
                                            Si <strong>{resetEmail}</strong> está registrado en el sistema, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                                        </p>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                                        <p className="text-amber-800 text-xs leading-relaxed">
                                            💡 <strong>Recuerda:</strong> Revisa tu carpeta de correo no deseado (spam). El enlace expira en <strong>1 hora</strong>.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeForgot}
                                        className="w-full h-12 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors border border-teal-200"
                                    >
                                        Volver al inicio de sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}

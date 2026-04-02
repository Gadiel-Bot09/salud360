import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Hospital, LogIn, Lock, Mail } from 'lucide-react'
import { login } from './actions'

export default function LoginPage({
    searchParams,
}: {
    searchParams: { error: string }
}) {
    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 relative selection:bg-teal-100 selection:text-teal-900">
            {/* Left Side - Hero Brand/Graphic Area */}
            <div className="hidden md:flex md:w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden text-white">
                
                {/* Dynamic Background Patterns / Gradients */}
                <div className="absolute inset-0 z-0 opacity-40 mix-blend-color-dodge">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-600 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-sky-800 rounded-full blur-[120px]" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                            <Hospital className="w-8 h-8 text-teal-400" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">Salud360</span>
                    </div>
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
                           <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                           <span>SaaS Edition v3.0</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-sm text-slate-400">© {new Date().getFullYear()} Grupo SinuFilas Inc.</p>
                </div>
            </div>

            {/* Right Side - Interactive Login Form */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white/50 backdrop-blur-3xl relative">
                
                {/* Mobile Hospital Brand (Only visible on mobile) */}
                <div className="absolute top-8 left-8 flex md:hidden items-center gap-2">
                     <Hospital className="w-6 h-6 text-teal-600" />
                     <span className="text-xl font-bold text-slate-800">Salud360</span>
                </div>

                <div className="w-full max-w-md space-y-8">
                    
                    <div className="text-center md:text-left space-y-3">
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Bienvenido de vuelta</h2>
                        <p className="text-slate-500">Ingresa tus credenciales para acceder a tu consola administrativa.</p>
                    </div>

                    <Card className="border-0 shadow-lg shadow-teal-900/5 bg-white ring-1 ring-slate-100">
                        <form>
                            <CardContent className="pt-8 space-y-5">
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
                                
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-slate-700 font-medium">Contraseña</Label>
                                        <a href="#" className="text-sm font-medium text-teal-600 hover:text-teal-500 hover:underline transition">
                                            ¿Olvidó su clave?
                                        </a>
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
                                
                                {searchParams?.error && (
                                    <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-lg flex items-start gap-2 border border-red-100 animate-in fade-in slide-in-from-top-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zm.453 8.247a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5zm.75 7.5a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                        {searchParams.error}
                                    </div>
                                )}
                            </CardContent>
                            
                            <CardFooter className="pb-8">
                                <Button formAction={login} className="w-full h-12 text-[15px] font-semibold bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5" type="submit">
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

                </div>
            </div>
        </div>
    )
}

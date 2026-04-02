import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Activity, ShieldCheck, PieChart, ChevronRight, Stethoscope } from 'lucide-react'

export default function SaaSLandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden font-sans text-slate-50 selection:bg-teal-500/30">
      
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-teal-600/20 rounded-full blur-[150px] mix-blend-screen" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-600/20 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
         <div className="flex items-center gap-2">
            <Stethoscope className="w-8 h-8 text-teal-400" />
            <span className="text-2xl font-bold tracking-tight text-white">Salud360</span>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-teal-500/10 text-teal-300 rounded-full border border-teal-500/20">B2B Edition</span>
         </div>
         <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
               Acceso Clientes
            </Link>
            <Button asChild className="bg-white text-slate-900 hover:bg-slate-100 rounded-full font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)]">
               <Link href="/login">Ingresar Creador</Link>
            </Button>
         </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32 text-center flex flex-col items-center">
         
         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
            <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-sm font-medium text-slate-300">Generador de Portales Clínicos Dinámicos Habilitado</span>
         </div>

         <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] max-w-4xl text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
            Digitaliza la Radicación Médica de tu Institución
         </h1>
         
         <p className="text-xl md:text-2xl text-slate-400 max-w-2xl font-light mb-12 leading-relaxed">
            Plataforma Multi-Tenant diseñada para clínicas y EPS. Crea tus propios cuestionarios, recibe radicados de pacientes y toma el control con analítica en vivo.
         </p>

         <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button asChild size="lg" className="bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-full h-14 px-8 text-lg font-bold shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-all hover:scale-105">
               <Link href="/login">
                  Comenzar Demostración <ChevronRight className="ml-2 w-5 h-5" />
               </Link>
            </Button>
            <p className="text-sm text-slate-500 sm:ml-4">Sin tarjetas de crédito. Setup instantáneo.</p>
         </div>

         {/* Hero Dashboard Preview (Mock) */}
         <div className="mt-20 relative w-full max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
            <div className="w-full bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-2 md:p-4 shadow-2xl">
               <div className="w-full h-8 bg-slate-900/50 rounded-t-xl border-b border-white/5 flex items-center px-4 mb-4">
                  <div className="flex gap-2">
                     <div className="w-3 h-3 rounded-full bg-red-500/50" />
                     <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                     <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-12">
                  <div className="h-32 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-center px-6">
                     <span className="text-slate-400 text-sm">Radicados Hoy</span>
                     <span className="text-3xl font-bold text-white mt-1">1,248</span>
                  </div>
                  <div className="h-32 rounded-lg justify-center p-6 bg-gradient-to-br from-teal-500/10 to-transparent border border-teal-500/20 md:col-span-2 relative overflow-hidden">
                     <span className="text-teal-400 text-sm">Formularios Dinámicos Visibles</span>
                     <div className="mt-4 flex gap-2 overflow-hidden opacity-50">
                        <div className="w-16 h-8 rounded bg-white/10" />
                        <div className="w-full h-8 rounded bg-white/10" />
                        <div className="w-24 h-8 rounded bg-white/10" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </main>

      {/* Features Grid */}
      <section className="relative z-10 bg-slate-950/50 border-y border-white/5 py-24">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
            
            <div className="space-y-4">
               <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                  <Activity className="w-7 h-7 text-teal-400" />
               </div>
               <h3 className="text-2xl font-bold text-white">Creador de Formularios</h3>
               <p className="text-slate-400 leading-relaxed">
                  Sistema visual (Drag & Drop) para que cada clínica estructure libremente las preguntas que quiere hacerle a sus pacientes.
               </p>
            </div>

            <div className="space-y-4">
               <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                  <ShieldCheck className="w-7 h-7 text-sky-400" />
               </div>
               <h3 className="text-2xl font-bold text-white">Marca Blanca (White-Label)</h3>
               <p className="text-slate-400 leading-relaxed">
                  Generamos una URL exclusiva `/portal/tu-clinica` para que el paciente solo vea tus preguntas y no conozca qué software usas de fondo.
               </p>
            </div>

            <div className="space-y-4">
               <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <PieChart className="w-7 h-7 text-indigo-400" />
               </div>
               <h3 className="text-2xl font-bold text-white">Inteligencia Analítica</h3>
               <p className="text-slate-400 leading-relaxed">
                  Agrupación de datos demográficos y tipos de trámites integrados automáticamente sobre el backend (Role Level Security).
               </p>
            </div>

         </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 text-center text-slate-500 text-sm">
         <p>© {new Date().getFullYear()} Grupo SinuFilas Inc. & Salud360. Todos los derechos comerciales reservados.</p>
      </footer>

    </div>
  )
}

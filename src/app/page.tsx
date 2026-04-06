import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Activity, ShieldCheck, PieChart, ChevronRight, Stethoscope, PhoneCall, LayoutDashboard, Send, Layers } from 'lucide-react'
import Image from 'next/image'

export default function SaaSLandingPage() {
  const WHATSAPP_URL = "https://wa.me/573012929983?text=Hola,%20estoy%20interesado%20en%20implementar%20Salud360%20en%20mi%20IPS"

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
            <Image src="/logo-white.svg" alt="Salud360 Logo" width={180} height={45} priority />
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-semibold bg-teal-500/10 text-teal-300 rounded-full border border-teal-500/20 mt-1">Enterprise</span>
         </div>
         <div className="flex items-center gap-4">
            <Link href={WHATSAPP_URL} target="_blank" className="hidden sm:flex text-sm font-medium text-slate-300 hover:text-white transition-colors items-center gap-1">
               <PhoneCall className="w-4 h-4" /> Hablar con Ventas
            </Link>
            <Button asChild className="bg-white text-slate-900 hover:bg-slate-100 rounded-full font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)]">
               <Link href="/login">Acceso Clientes</Link>
            </Button>
         </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24 text-center flex flex-col items-center">
         
         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
            <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-sm font-medium text-slate-300">Generador de Portales Clínicos Dinámicos Habilitado</span>
         </div>

         <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] max-w-4xl text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
            Digitaliza la Radicación Médica de tu Institución
         </h1>
         
         <p className="text-xl md:text-2xl text-slate-400 max-w-2xl font-light mb-10 leading-relaxed">
            Nuestra plataforma SaaS elimina el papeleo físico. Transforma citas, PQR y autorizaciones médicas en procesos automatizados y medibles al instante para tu EPS o IPS.
         </p>

         <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button asChild size="lg" className="bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-full h-14 px-8 text-lg font-bold shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-all hover:scale-105">
               <Link href="/login">
                  Ingresar a tu Panel <ChevronRight className="ml-2 w-5 h-5" />
               </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white rounded-full h-14 px-8 text-lg hover:border-slate-500 transition-all">
               <Link href={WHATSAPP_URL} target="_blank">
                  <PhoneCall className="mr-2 w-5 h-5 text-green-400" />  Contactar Asesor
               </Link>
            </Button>
         </div>

      </main>

      {/* Como Funciona - Deep Dive Section */}
      <section className="relative z-10 py-20 bg-slate-900/50 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
           <div className="mb-16 text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">¿Por qué usar Salud360?</h2>
              <p className="text-slate-400 text-lg">El ecosistema de gestión más avanzado. No importa qué tipo de radicado necesites, nuestro motor se adapta a las normativas de tu clínica.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              {/* Image / Graphic Representing Software */}
              <div className="relative">
                 <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-transparent rounded-3xl transform rotate-3 scale-105" />
                 <div className="relative bg-slate-800/80 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                       <LayoutDashboard className="w-6 h-6 text-teal-400" />
                       <span className="font-semibold text-white">Tu Creador de Formularios (Admin)</span>
                    </div>
                    <div className="space-y-4 opacity-80">
                       <div className="h-4 bg-white/10 rounded w-1/2" />
                       <div className="h-10 bg-white/5 border border-dashed border-white/20 rounded flex items-center justify-center text-xs text-white/50">+ Agregar Pregunta</div>
                       <div className="h-10 bg-white/5 rounded w-full" />
                       <div className="h-10 bg-teal-500/20 border border-teal-500/30 rounded w-1/3 mt-4" />
                    </div>
                 </div>
              </div>

              {/* Text Highlights */}
              <div className="space-y-8">
                 <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 border border-teal-500/30">
                       <Layers className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                       <h4 className="text-xl font-bold text-white mb-2">Construye tus Propios Cuestionarios</h4>
                       <p className="text-slate-400">Las clínicas no necesitan programación. Tienes un "Constructor de Formularios" Drag & Drop para pedirle historias clínicas, PDFs y datos clave al paciente dependiendo de si piden una cita, fórmula o PQR.</p>
                    </div>
                 </div>
                 
                 <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 border border-sky-500/30">
                       <ShieldCheck className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                       <h4 className="text-xl font-bold text-white mb-2">Marca Blanca Aislada (Multi-Tenant)</h4>
                       <p className="text-slate-400">Tus datos nunca se cruzarán con otra EPS. La arquitectura RLS separa estrictamente tu información. Generamos un portal `salud360.com/portal/tu-clinica` para que se lo envíes a tus pacientes vía WhatsApp.</p>
                    </div>
                 </div>

                 <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                       <Send className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                       <h4 className="text-xl font-bold text-white mb-2">Notificaciones y Alertas Constantes</h4>
                       <p className="text-slate-400">Cada vez que un paciente hace una radicación, Salud360 notifica y genera números únicos de rastreabilidad. Además, cuentas con un Dashboard analítico moderno para supervisar a tu equipo auditor.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Heavy CTA Footer */}
      <section className="relative z-10 py-24 px-6">
         <div className="max-w-5xl mx-auto bg-gradient-to-tr from-teal-900/60 to-slate-800/80 rounded-3xl p-10 md:p-16 border border-teal-500/30 text-center shadow-2xl relative overflow-hidden">
             
             {/* Decorative blob inside CTA */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 rounded-full blur-[80px]" />

             <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6 relative z-10">Revoluciona tu gestión médica hoy.</h2>
             <p className="text-teal-100/70 text-lg md:text-xl mb-10 max-w-2xl mx-auto relative z-10">
                Ponte en contacto comercial directo con nosotros para agendar una implementación piloto presencial o por videollamada sin compromisos. O crea tu cuenta directamente.
             </p>
             <div className="flex flex-col sm:flex-row justify-center items-center gap-4 relative z-10">
                <Button asChild size="lg" className="bg-green-500 hover:bg-green-400 text-slate-900 rounded-full h-14 px-10 text-lg font-bold shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all">
                   <Link href={WHATSAPP_URL} target="_blank">
                      <PhoneCall className="mr-2 w-5 h-5" /> Chat al +57 301 292 9983
                   </Link>
                </Button>
             </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-slate-600 text-sm border-t border-white/5 bg-slate-950">
         <p>© {new Date().getFullYear()} Grupo SinuFilas Inc. & Salud360. Todos los derechos comerciales reservados.</p>
      </footer>

    </div>
  )
}

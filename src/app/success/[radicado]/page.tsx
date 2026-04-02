import { Button } from '@/components/ui/button'
import { CheckCircle2, Copy } from 'lucide-react'
import Link from 'next/link'

export default function SuccessPage({ params }: { params: { radicado: string } }) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-slate-100 text-center">
                <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-500" strokeWidth={1.5} />

                <h2 className="mt-6 text-3xl font-extrabold text-slate-800">
                    ¡Solicitud Exitosa!
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                    Hemos recibido su solicitud y la estamos procesando. Por favor, guarde este número de radicado; lo necesitará para consultas futuras.
                </p>

                <div className="mt-8 bg-slate-50 border border-slate-200 rounded-lg p-6 font-mono text-2xl tracking-wider text-slate-900 flex items-center justify-between">
                    <span>{params.radicado}</span>
                    <button
                        className="text-slate-400 hover:text-teal-600 transition"
                        title="Copiar radicado"
                    >
                        <Copy className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-8">
                    <Link href="/">
                        <Button className="w-full bg-teal-600 hover:bg-teal-700">
                            Realizar otra solicitud
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

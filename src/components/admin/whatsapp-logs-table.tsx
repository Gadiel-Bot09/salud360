'use client'

import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, MessageSquare, CheckCircle2, XCircle, Clock, CalendarClock, Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatCO } from '@/lib/utils'

export function WhatsAppLogsTable({ initialData }: { initialData: any[] }) {
    const [search, setSearch] = useState('')

    const filtered = initialData.filter(log => {
        const query = search.toLowerCase()
        return (
            !query ||
            log.patient_phone?.includes(query) ||
            log.requests?.radicado?.toLowerCase().includes(query) ||
            log.message_content?.toLowerCase().includes(query)
        )
    })

    return (
        <div className="space-y-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Buscar por teléfono o radicado..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            <div className="rounded-md border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Destinatario</TableHead>
                            <TableHead>Contexto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-1/3">Mensaje</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                                    No se encontraron registros.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(log => (
                                <TableRow key={log.id} className="hover:bg-slate-50">
                                    <TableCell className="text-slate-600 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {formatCO(new Date(log.created_at), "d MMM yyyy, HH:mm")}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                            <Phone className="w-3.5 h-3.5 text-teal-600" />
                                            {log.patient_phone}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {log.request_id ? (
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                                    {log.requests?.radicado}
                                                </span>
                                            </div>
                                        ) : log.appointment_id ? (
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                                                <span className="text-slate-600">Recordatorio</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-sm">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {log.status === 'sent' ? (
                                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Enviado
                                            </Badge>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="destructive" className="w-fit">
                                                    <XCircle className="w-3.5 h-3.5 mr-1" /> Error
                                                </Badge>
                                                {log.error_message && (
                                                    <span className="text-xs text-red-600 line-clamp-1 max-w-[200px]" title={log.error_message}>
                                                        {log.error_message}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-2 rounded-lg line-clamp-2 hover:line-clamp-none cursor-pointer" title="Haz clic para expandir">
                                            {log.message_content}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <p className="text-right text-xs text-slate-400 mt-2">
                Mostrando {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
            </p>
        </div>
    )
}

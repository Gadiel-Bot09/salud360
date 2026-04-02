/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Button } from '@/components/ui/button'
import { Eye, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Request } from '@/types'

export function RequestsTable({ initialData }: { initialData: any[] }) {
    const [data] = useState<any[]>(initialData)

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'received':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Recibida</Badge>
            case 'processing':
                return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">En Trámite</Badge>
            case 'responded':
                return <Badge variant="secondary" className="bg-teal-100 text-teal-800 hover:bg-teal-100">Respondida</Badge>
            case 'closed':
                return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Cerrada</Badge>
            case 'escalated':
                return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">Escalada</Badge>
            default:
                return <Badge>{status}</Badge>
        }
    }

    const getPriorityBadge = (priority: string) => {
        if (priority === 'urgent') return <Badge variant="destructive">Urgente</Badge>
        if (priority === 'high') return <Badge className="bg-orange-500 hover:bg-orange-600">Alta</Badge>
        return null
    }

    return (
        <div className="rounded-md border border-slate-200">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="font-semibold text-slate-700">Radicado</TableHead>
                        <TableHead className="font-semibold text-slate-700">Fecha</TableHead>
                        <TableHead className="font-semibold text-slate-700">Paciente</TableHead>
                        <TableHead className="font-semibold text-slate-700">Tipo</TableHead>
                        <TableHead className="font-semibold text-slate-700">Estado</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                                No hay solicitudes para mostrar
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((req) => (
                            <TableRow key={req.id} className="hover:bg-slate-50 transition-colors">
                                <TableCell className="font-medium">
                                    {req.radicado}
                                    <div className="mt-1">{getPriorityBadge(req.priority)}</div>
                                </TableCell>
                                <TableCell className="text-slate-600">
                                    {format(new Date(req.created_at), "d MMM, yyyy", { locale: es })}
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium text-slate-900">{req.patient_data_json.fullName || 'N/A'}</div>
                                    <div className="text-xs text-slate-500">{req.patient_document_type} {req.patient_document_number}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-2">
                                        <FileText className="h-4 w-4 text-slate-400" />
                                        <span>{req.type}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {getStatusBadge(req.status)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                                        <Eye className="h-4 w-4 mr-1" /> Ver Detalle
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

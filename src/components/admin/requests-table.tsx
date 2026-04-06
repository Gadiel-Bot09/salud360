/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useMemo } from 'react'
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
import { Input } from '@/components/ui/input'
import { Eye, FileText, Search, X, Paperclip } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { ExportButtons } from './export-buttons'

export function RequestsTable({ initialData }: { initialData: any[] }) {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    // Filter data based on search & status
    const filtered = useMemo(() => {
        return initialData.filter((req) => {
            const query = search.toLowerCase()
            const patientName = req.patient_data_json?.fullName || ''
            const matchesSearch =
                !query ||
                req.radicado?.toLowerCase().includes(query) ||
                patientName.toLowerCase().includes(query) ||
                req.patient_document_number?.toLowerCase().includes(query) ||
                req.type?.toLowerCase().includes(query)

            const matchesStatus = statusFilter === 'all' || req.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [initialData, search, statusFilter])

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

    const STATUS_OPTIONS = [
        { label: 'Todos los estados', value: 'all' },
        { label: 'Recibidas', value: 'received' },
        { label: 'En Trámite', value: 'processing' },
        { label: 'Respondidas', value: 'responded' },
        { label: 'Cerradas', value: 'closed' },
        { label: 'Escaladas', value: 'escalated' },
    ]

    return (
        <div className="space-y-4">
            {/* Toolbar: Search + Filter + Export */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por radicado, paciente, doc..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 text-sm border-slate-200"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                            </button>
                        )}
                    </div>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {/* Export Buttons — gets the currently filtered data */}
                <ExportButtons data={filtered} />
            </div>

            {/* Table */}
            <div className="rounded-md border border-slate-200 overflow-hidden">
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
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                                    {search || statusFilter !== 'all'
                                        ? 'No se encontraron solicitudes con los filtros aplicados.'
                                        : 'No hay solicitudes para mostrar.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((req) => (
                                <TableRow key={req.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell className="font-medium">
                                        {req.radicado}
                                        <div className="mt-1">{getPriorityBadge(req.priority)}</div>
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {format(new Date(req.created_at), "d MMM, yyyy", { locale: es })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">
                                            {req.patient_data_json?.fullName || <span className="text-slate-400 italic text-xs">Sin nombre</span>}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">{req.patient_document_type} {req.patient_document_number}</div>
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
                                        <div className="flex items-center justify-end gap-2">
                                            {(req.request_attachments?.length > 0 || req.attachments_count > 0) && (
                                              <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                                                <Paperclip className="h-3 w-3" />{req.request_attachments?.length || ''}
                                              </span>
                                            )}
                                            <Button asChild variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                                                <Link href={`/admin/requests/${req.id}`}>
                                                    <Eye className="h-4 w-4 mr-1" /> Ver Detalle
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Summary footer */}
            {initialData.length > 0 && (
                <p className="text-xs text-slate-400 text-right">
                    Mostrando {filtered.length} de {initialData.length} solicitudes
                </p>
            )}
        </div>
    )
}

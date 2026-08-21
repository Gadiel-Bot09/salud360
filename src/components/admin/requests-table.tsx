/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Eye, FileText, Search, X, Paperclip, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { formatCO } from '@/lib/utils'
import { differenceInDays, startOfDay } from 'date-fns'
import Link from 'next/link'
import { ExportButtons } from './export-buttons'

const PAGE_SIZE = 30

export function RequestsTable({ initialData }: { initialData: any[] }) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)

    // Auto-refresh the page data every 15 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh()
        }, 15000)
        return () => clearInterval(interval)
    }, [router])

    // Reset to page 1 whenever search or filter changes
    useEffect(() => {
        setPage(1)
    }, [search, statusFilter])

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

            const isPending = req.status === 'received' || req.status === 'processing' || req.status === 'escalated'
            const daysElapsed = differenceInDays(startOfDay(new Date()), startOfDay(new Date(req.created_at)))
            const isDelayed = isPending && daysElapsed >= 5

            const matchesStatus =
                statusFilter === 'all' ? true :
                statusFilter === 'delayed' ? isDelayed :
                req.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [initialData, search, statusFilter])

    // Count of overdue pending requests (for toolbar alert)
    const overdueCount = useMemo(() =>
        initialData.filter(req => {
            const isPending = req.status === 'received' || req.status === 'processing' || req.status === 'escalated'
            return isPending && differenceInDays(startOfDay(new Date()), startOfDay(new Date(req.created_at))) >= 5
        }).length
    , [initialData])

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const safePage = Math.min(page, totalPages)
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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
        { label: '🔴 Con Atraso (+5 días)', value: 'delayed' },
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

                {/* Export Buttons — gets the currently filtered data (all pages) */}
                <ExportButtons data={filtered} />
            </div>

            {/* Overdue alert banner */}
            {overdueCount > 0 && statusFilter !== 'delayed' && (
                <button
                    onClick={() => setStatusFilter('delayed')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors animate-pulse"
                >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>
                        {overdueCount} solicitud{overdueCount !== 1 ? 'es' : ''} con más de 5 días sin respuesta — requieren atención inmediata
                    </span>
                    <span className="ml-auto text-xs underline">Ver atrasadas →</span>
                </button>
            )}

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
                            <TableHead className="font-semibold text-slate-700">Gestor</TableHead>
                            <TableHead className="text-right font-semibold text-slate-700">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                                    {search || statusFilter !== 'all'
                                        ? 'No se encontraron solicitudes con los filtros aplicados.'
                                        : 'No hay solicitudes para mostrar.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((req) => {
                                // Indicator logic for requests older than 5 days without response
                                const isPending = req.status === 'received' || req.status === 'processing' || req.status === 'escalated'
                                const daysElapsed = differenceInDays(startOfDay(new Date()), startOfDay(new Date(req.created_at)))
                                const isDelayed = isPending && daysElapsed >= 5

                                // ── TODO: Restaurar al pasar a Supabase Pro ───────────────────────
                                // La columna "Gestor" mostraba el nombre del último usuario que respondió
                                // la solicitud. Se eliminó temporalmente porque el JOIN con request_history
                                // en el listado causaba 2.27 BILLION lecturas secuenciales de disco.
                                //
                                // Para restaurar: en requests/page.tsx cambiar el .select() a:
                                //   .select('*, request_attachments(id), request_history(created_at, action, user_id)')
                                // Y restaurar la query de usuarios:
                                //   const { data: usersList } = await supabase.from('users').select('id, full_name')
                                //   const userMap = (usersList || []).reduce((acc, u) => ({ ...acc, [u.id]: u.full_name }), {})
                                // Y restaurar aquí:
                                //   const historyArray = req.request_history || []
                                //   const lastUserEntry = [...historyArray].reverse().find((h: any) => h.users?.full_name)
                                //   const responderName = lastUserEntry ? lastUserEntry.users.full_name : 'No asignado'
                                // ─────────────────────────────────────────────────────────────────
                                const responderName = req.assigned_to_name || '—'

                                let rowClass = "hover:bg-slate-50 transition-colors"
                                if (isDelayed) rowClass = "bg-red-50 hover:bg-red-100 transition-colors"
                                else if (req.status === 'processing') rowClass += " bg-amber-50/30"
                                else if (req.status === 'escalated') rowClass += " bg-red-50/30"

                                return (
                                    <TableRow key={req.id} className={rowClass}>
                                        <TableCell className={`font-medium ${isDelayed ? 'border-l-4 border-l-red-500' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                {isDelayed && (
                                                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                                    </span>
                                                )}
                                                <span>{req.radicado}</span>
                                            </div>
                                            <div className="mt-1">{getPriorityBadge(req.priority)}</div>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {formatCO(new Date(req.created_at), "d MMM, yyyy")}
                                            {isDelayed && (
                                                <div className="mt-1 flex items-center gap-1 text-red-700 bg-red-100 text-[11px] font-bold px-2 py-0.5 rounded-full w-max border border-red-300">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {daysElapsed} días sin respuesta
                                                </div>
                                            )}
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
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-medium ${responderName !== 'No asignado' ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                                        {responderName}
                                                    </span>
                                                </div>
                                            </div>
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
                                    )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination + Summary footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                {/* Summary */}
                <p className="text-xs text-slate-400 order-2 sm:order-1">
                    {filtered.length === 0
                        ? 'Sin resultados'
                        : `Mostrando ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length} solicitudes`}
                </p>

                {/* Pagination controls */}
                {totalPages > 1 && (
                    <div className="flex items-center gap-1 order-1 sm:order-2">
                        {/* First */}
                        <button
                            onClick={() => setPage(1)}
                            disabled={safePage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Primera página"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                        {/* Prev */}
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Página anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
                                acc.push(p)
                                return acc
                            }, [])
                            .map((p, i) =>
                                p === '...' ? (
                                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm select-none">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p as number)}
                                        className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-semibold border transition-colors ${
                                            safePage === p
                                                ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            )
                        }

                        {/* Next */}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Página siguiente"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        {/* Last */}
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={safePage === totalPages}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Última página"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

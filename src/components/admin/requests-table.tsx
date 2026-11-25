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
const VALID_FILTERS = ['received', 'delayed', 'processing', 'responded', 'closed', 'escalated', 'all'] as const
type RequestStatusFilter = (typeof VALID_FILTERS)[number]

export function RequestsTable({ initialData }: { initialData: any[] }) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    // Filtro predeterminado: "Recibida" para mantener la bandeja limpia y enfocada en pendientes por gestionar
    const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('received')
    const [page, setPage] = useState(1)

    // Leer filtro inicial desde URL (?status=...) si el usuario llega con un enlace o vuelve atrás
    useEffect(() => {
        if (typeof window === 'undefined') return
        const urlStatus = new URLSearchParams(window.location.search).get('status') as RequestStatusFilter | null
        if (urlStatus && VALID_FILTERS.includes(urlStatus)) {
            setStatusFilter(urlStatus)
        }
    }, [])

    const handleStatusChange = (nextStatus: RequestStatusFilter) => {
        setStatusFilter(nextStatus)
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            if (nextStatus === 'received') {
                url.searchParams.delete('status')
            } else {
                url.searchParams.set('status', nextStatus)
            }
            window.history.replaceState({}, '', url.toString())
        }
    }

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

    // Helper de búsqueda reutilizable (paciente, radicado, documento, tipo y servicio)
    const matchesQuery = (req: any, q: string) => {
        if (!q) return true
        const patientName = req.patient_data_json?.fullName || req.patient_data_json?.['Nombre Completo'] || ''
        const servicio = req.patient_data_json?.['Tipo de Solicitud'] || ''
        return (
            req.radicado?.toLowerCase().includes(q) ||
            patientName.toLowerCase().includes(q) ||
            req.patient_document_number?.toLowerCase().includes(q) ||
            req.type?.toLowerCase().includes(q) ||
            servicio.toLowerCase().includes(q)
        )
    }

    // Contadores en vivo por estado para las píldoras de navegación rápida
    const statusCounts = useMemo(() => {
        const counts = {
            all: initialData.length,
            received: 0,
            delayed: 0,
            processing: 0,
            responded: 0,
            closed: 0,
            escalated: 0,
        }
        const todayStart = startOfDay(new Date())
        for (const req of initialData) {
            if (req.status === 'received') counts.received++
            else if (req.status === 'processing') counts.processing++
            else if (req.status === 'responded') counts.responded++
            else if (req.status === 'closed') counts.closed++
            else if (req.status === 'escalated') counts.escalated++

            const isPending = req.status === 'received' || req.status === 'processing' || req.status === 'escalated'
            if (isPending && differenceInDays(todayStart, startOfDay(new Date(req.created_at))) >= 5) {
                counts.delayed++
            }
        }
        return counts
    }, [initialData])

    const overdueCount = statusCounts.delayed

    // Filter data based on search & status
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase()
        const todayStart = startOfDay(new Date())
        return initialData.filter((req) => {
            if (!matchesQuery(req, query)) return false

            const isPending = req.status === 'received' || req.status === 'processing' || req.status === 'escalated'
            const daysElapsed = differenceInDays(todayStart, startOfDay(new Date(req.created_at)))
            const isDelayed = isPending && daysElapsed >= 5

            const matchesStatus =
                statusFilter === 'all' ? true :
                statusFilter === 'delayed' ? isDelayed :
                req.status === statusFilter

            return matchesStatus
        })
    }, [initialData, search, statusFilter])

    // Búsqueda inteligente: contar coincidencias en OTROS estados cuando el usuario busca estando filtrado (ej. en "Recibida")
    const otherStatusesSearchCount = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query || statusFilter === 'all') return 0
        const totalMatchingQuery = initialData.filter(req => matchesQuery(req, query)).length
        return Math.max(0, totalMatchingQuery - filtered.length)
    }, [initialData, search, statusFilter, filtered.length])

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

    const STATUS_TABS: { value: RequestStatusFilter; label: string; count: number; activeStyle: string }[] = [
        { value: 'received',   label: 'Recibidas',           count: statusCounts.received,   activeStyle: 'bg-blue-600 text-white border-blue-600 shadow-sm' },
        { value: 'delayed',    label: '🔴 Atrasadas (+5d)',   count: statusCounts.delayed,    activeStyle: 'bg-red-600 text-white border-red-600 shadow-sm' },
        { value: 'processing', label: 'En Trámite',          count: statusCounts.processing, activeStyle: 'bg-amber-600 text-white border-amber-600 shadow-sm' },
        { value: 'responded',  label: 'Respondidas',         count: statusCounts.responded,  activeStyle: 'bg-teal-700 text-white border-teal-700 shadow-sm' },
        { value: 'closed',     label: 'Cerradas',            count: statusCounts.closed,     activeStyle: 'bg-emerald-700 text-white border-emerald-700 shadow-sm' },
        ...(statusCounts.escalated > 0 ? [{ value: 'escalated' as RequestStatusFilter, label: 'Escaladas', count: statusCounts.escalated, activeStyle: 'bg-rose-700 text-white border-rose-700 shadow-sm' }] : []),
        { value: 'all',        label: 'Todos los estados',   count: statusCounts.all,        activeStyle: 'bg-slate-800 text-white border-slate-800 shadow-sm' },
    ]

    return (
        <div className="space-y-4">
            {/* Toolbar: Search + Export */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por radicado, paciente, doc o servicio..."
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
                </div>

                {/* Export Buttons — gets the currently filtered data (all pages) */}
                <ExportButtons data={filtered} />
            </div>

            {/* Quick Status Filter Pills (Predeterminado: Recibidas) */}
            <div className="flex flex-wrap items-center gap-2 pb-1">
                {STATUS_TABS.map((tab) => {
                    const isActive = statusFilter === tab.value
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => handleStatusChange(tab.value)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                isActive
                                    ? tab.activeStyle
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Cross-status search hint (si el gestor busca un radicado/paciente que ya fue respondido o está en otro estado) */}
            {otherStatusesSearchCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 text-xs font-medium">
                    <span>
                        🔍 Se encontraron <strong>{otherStatusesSearchCount}</strong> coincidencia(s) adicional(es) para &ldquo;<strong>{search}</strong>&rdquo; en otros estados (Respondidas, En Trámite o Cerradas).
                    </span>
                    <button
                        type="button"
                        onClick={() => handleStatusChange('all')}
                        className="font-bold text-indigo-700 hover:text-indigo-900 underline shrink-0 text-left sm:text-right"
                    >
                        Ver en todos los estados →
                    </button>
                </div>
            )}

            {/* Overdue alert banner */}
            {overdueCount > 0 && statusFilter !== 'delayed' && (
                <button
                    onClick={() => handleStatusChange('delayed')}
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
                            <TableHead className="font-semibold text-slate-700">Canal</TableHead>
                            <TableHead className="font-semibold text-slate-700">Gestor</TableHead>
                            <TableHead className="text-right font-semibold text-slate-700">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                                    <div className="space-y-2">
                                        <p className="font-medium text-slate-500">
                                            {search
                                                ? `No se encontraron solicitudes en "${STATUS_TABS.find(t => t.value === statusFilter)?.label || statusFilter}" para "${search}".`
                                                : statusFilter === 'received'
                                                ? '🎉 ¡Bandeja limpia! No hay solicitudes en estado Recibida pendientes por gestionar.'
                                                : 'No hay solicitudes para mostrar en este estado.'}
                                        </p>
                                        {statusFilter !== 'all' && (
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange('all')}
                                                className="text-xs font-semibold text-teal-700 hover:underline"
                                            >
                                                Ver todos los estados ({statusCounts.all}) →
                                            </button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((req) => {
                                // Indicator logic for requests older than 5 days without response
                                const isPending = req.status === 'received' || req.status === 'processing' || req.status === 'escalated'
                                const daysElapsed = differenceInDays(startOfDay(new Date()), startOfDay(new Date(req.created_at)))
                                const isDelayed = isPending && daysElapsed >= 5

                                // Buscar el último gestor que interactuó con la solicitud
                                const historyArray = req.request_history || []
                                const lastUserEntry = [...historyArray].reverse().find((h: any) => h.users?.full_name)
                                const responderName = lastUserEntry ? lastUserEntry.users.full_name : (req.assigned_to_name || 'Sin asignar')

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
                                            {req.canal === 'presencial' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                                                    🏥 Presencial
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                                    🌐 Online
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-medium ${responderName !== 'Sin asignar' ? 'text-slate-700' : 'text-slate-400 italic'}`}>
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

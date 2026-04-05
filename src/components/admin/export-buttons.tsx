'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RequestRow {
  radicado: string
  created_at: string
  patient_data_json: Record<string, string>
  patient_document_type: string
  patient_document_number: string
  type: string
  status: string
  priority: string
}

const STATUS_LABELS: Record<string, string> = {
  received: 'Recibida',
  processing: 'En Trámite',
  responded: 'Respondida',
  closed: 'Cerrada',
  escalated: 'Escalada',
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
}

function buildRows(data: RequestRow[]) {
  return data.map((req) => ({
    Radicado: req.radicado,
    Fecha: format(new Date(req.created_at), 'd MMM yyyy HH:mm', { locale: es }),
    Paciente: req.patient_data_json?.fullName || 'N/A',
    'Tipo Doc.': req.patient_document_type,
    'Nro. Doc.': req.patient_document_number,
    Trámite: req.type,
    Estado: STATUS_LABELS[req.status] || req.status,
    Prioridad: PRIORITY_LABELS[req.priority] || 'Normal',
  }))
}

// ── Excel Export ──────────────────────────────────────────────────────────────
async function exportToExcel(data: RequestRow[]) {
  const { utils, writeFile } = await import('xlsx')
  const rows = buildRows(data)
  const ws = utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 20 }, { wch: 20 }, { wch: 28 }, { wch: 12 }, { wch: 16 },
    { wch: 24 }, { wch: 14 }, { wch: 12 },
  ]

  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Radicados')
  writeFile(wb, `Salud360_Radicados_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`)
}

// ── PDF Export ────────────────────────────────────────────────────────────────
async function exportToPDF(data: RequestRow[]) {
  const { default: jsPDF } = await import('jspdf')
  // @ts-expect-error: no types package for jspdf-autotable
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  // Header
  doc.setFillColor(15, 118, 110)  // teal-700
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 50, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Salud360 — Reporte de Solicitudes', 40, 32)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado el ${format(new Date(), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}`, 40, 46)

  const rows = buildRows(data)
  const head = [Object.keys(rows[0])]
  const body = rows.map(Object.values)

  autoTable(doc, {
    head,
    body,
    startY: 65,
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 40, right: 40 },
  })

  // Page numbers
  const pages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Página ${i} de ${pages}`,
      doc.internal.pageSize.getWidth() - 80,
      doc.internal.pageSize.getHeight() - 15
    )
  }

  doc.save(`Salud360_Radicados_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`)
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ExportButtons({ data }: { data: RequestRow[] }) {
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)

  const handleExcel = async () => {
    if (!data.length) return
    setLoadingExcel(true)
    try { await exportToExcel(data) } finally { setLoadingExcel(false) }
  }

  const handlePdf = async () => {
    if (!data.length) return
    setLoadingPdf(true)
    try { await exportToPDF(data) } finally { setLoadingPdf(false) }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleExcel}
        disabled={loadingExcel || !data.length}
        variant="outline"
        size="sm"
        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
      >
        {loadingExcel
          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          : <FileSpreadsheet className="h-4 w-4 mr-2" />}
        Exportar Excel
      </Button>

      <Button
        onClick={handlePdf}
        disabled={loadingPdf || !data.length}
        variant="outline"
        size="sm"
        className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
      >
        {loadingPdf
          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          : <FileText className="h-4 w-4 mr-2" />}
        Exportar PDF
      </Button>

      {data.length > 0 && (
        <span className="text-xs text-slate-400 ml-1 flex items-center gap-1">
          <Download className="h-3 w-3" /> {data.length} registros
        </span>
      )}
    </div>
  )
}

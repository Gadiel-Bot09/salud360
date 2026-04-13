import { getAppointmentsByDate } from './actions'
import { AppointmentsTable } from '@/components/admin/appointments-table'
import { CalendarDays } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AppointmentsPage({
  searchParams
}: {
  searchParams: { date?: string }
}) {
  const today = new Date().toISOString().split('T')[0]
  const selectedDate = searchParams.date || today

  const appointments = await getAppointmentsByDate(selectedDate)

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-600/30">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Citas del Día</h1>
            <p className="text-slate-500 text-sm mt-0.5 capitalize">{dateLabel}</p>
          </div>
        </div>

        {/* Date Picker */}
        <form method="GET" action="/admin/appointments" className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-600">Ver fecha:</label>
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white shadow-sm"
          />
          <button
            type="submit"
            className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Ver
          </button>
        </form>
      </div>

      <AppointmentsTable appointments={appointments} />
    </div>
  )
}

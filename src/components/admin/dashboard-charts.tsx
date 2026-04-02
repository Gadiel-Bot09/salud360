'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { Activity, CircleCheckBig, Clock, PlusCircle } from "lucide-react"

interface DashboardChartsProps {
  metrics: {
    total: number;
    open: number;
    closed: number;
    inProgress: number;
    requestsByType: { name: string; value: number }[];
    requestsByDate: { date: string; value: number }[];
  }
}

const COLORS = ['#0f766e', '#0369a1', '#be123c', '#d97706', '#4338ca', '#047857']

export function DashboardCharts({ metrics }: DashboardChartsProps) {
  return (
    <div className="space-y-8">
      
      {/* Metrics Kardex */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-slate-400 max-h-32">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Radicados Históricos</CardTitle>
                <Activity className="h-4 w-4 text-slate-400" />
             </CardHeader>
             <CardContent>
                <div className="text-3xl font-bold">{metrics.total}</div>
                <p className="text-xs text-slate-400">Total desde el primer día</p>
             </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 max-h-32">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-700">Sin Atender (Nuevos)</CardTitle>
                <PlusCircle className="h-4 w-4 text-amber-500" />
             </CardHeader>
             <CardContent>
                <div className="text-3xl font-bold text-amber-600">{metrics.open}</div>
                <p className="text-xs text-amber-600/60">Esperando respuesta inicial</p>
             </CardContent>
          </Card>

          <Card className="border-l-4 border-l-sky-500 max-h-32">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-sky-700">En Trámite</CardTitle>
                <Clock className="h-4 w-4 text-sky-500" />
             </CardHeader>
             <CardContent>
                <div className="text-3xl font-bold text-sky-600">{metrics.inProgress}</div>
                <p className="text-xs text-sky-600/60">Auditados / Escalados</p>
             </CardContent>
          </Card>

          <Card className="border-l-4 border-l-teal-600 max-h-32">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-teal-700">Casos Cerrados</CardTitle>
                <CircleCheckBig className="h-4 w-4 text-teal-600" />
             </CardHeader>
             <CardContent>
                <div className="text-3xl font-bold text-teal-700">{metrics.closed}</div>
                <p className="text-xs text-teal-600/60">Tickets finalizados</p>
             </CardContent>
          </Card>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <Card className="lg:col-span-2 shadow-sm border-slate-200">
             <CardHeader>
                 <CardTitle>Volúmen de Entrada Semanal</CardTitle>
                 <CardDescription>Cantidad de radicados recibidos en los últimos 7 días</CardDescription>
             </CardHeader>
             <CardContent className="h-80 select-none">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={metrics.requestsByDate} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                       <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 13 }} 
                          dy={10}
                       />
                       <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 13 }} 
                       />
                       <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                       <Bar 
                          name="Radicados" 
                          dataKey="value" 
                          fill="#0f766e" 
                          radius={[4, 4, 0, 0]} 
                          barSize={40}
                       />
                   </BarChart>
                 </ResponsiveContainer>
             </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
             <CardHeader>
                 <CardTitle>Demanda por Trámite</CardTitle>
                 <CardDescription>Motivos más frecuentes</CardDescription>
             </CardHeader>
             <CardContent className="h-80 flex items-center justify-center select-none pt-0">
                 {metrics.requestsByType.length === 0 ? (
                     <div className="text-slate-400 text-sm">Sin datos para mostrar</div>
                 ) : (
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={metrics.requestsByType}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                         >
                            {metrics.requestsByType.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                         </Pie>
                         <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                         <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                   </ResponsiveContainer>
                 )}
             </CardContent>
          </Card>
      </div>

    </div>
  )
}

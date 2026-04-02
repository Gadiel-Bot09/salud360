'use server'

import { createClient } from '@/lib/supabase/server'

export interface DashboardMetrics {
  total: number;
  open: number;
  closed: number;
  inProgress: number;
  requestsByType: { name: string; value: number }[];
  requestsByDate: { date: string; value: number }[];
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics | null> {
  const supabase = await createClient()

  // 1. RLS will naturally restrict this to the User's Institution unless they are Super Admin
  const { data: requests, error } = await supabase
    .from('requests')
    .select('id, status, type, created_at')

  if (error || !requests) {
    console.error('Failed to fetch analytical metrics:', error)
    return null
  }

  // 2. Compute Global Counters
  const total = requests.length
  const open = requests.filter(r => r.status === 'received').length
  const closed = requests.filter(r => r.status === 'closed' || r.status === 'responded').length
  const inProgress = requests.filter(r => r.status === 'processing' || r.status === 'escalated').length

  // 3. Compute Pie Chart (By Type)
  const typeCounter: Record<string, number> = {}
  requests.forEach(r => {
     typeCounter[r.type] = (typeCounter[r.type] || 0) + 1
  })
  const requestsByType = Object.keys(typeCounter).map(type => ({
     name: type, value: typeCounter[type]
  })).sort((a,b) => b.value - a.value)

  // 4. Compute Bar Chart (Last 7 Days)
  const dateCounter: Record<string, number> = {}
  // Initialize last 7 days with zero
  for(let i = 6; i >= 0; i--) {
     const d = new Date()
     d.setDate(d.getDate() - i)
     dateCounter[d.toISOString().split('T')[0]] = 0
  }
  
  requests.forEach(r => {
     const dateKey = new Date(r.created_at).toISOString().split('T')[0]
     if (dateCounter[dateKey] !== undefined) {
         dateCounter[dateKey] += 1
     }
  })
  
  const requestsByDate = Object.keys(dateCounter)
     .sort() // chronological order
     .map(date => {
        // Convert to shorter format like "Mar 24"
        const [, month, day] = date.split('-')
        return { 
           date: `${day}/${month}`, 
           rawDate: date,
           value: dateCounter[date] 
        }
     })

  return { total, open, closed, inProgress, requestsByType, requestsByDate }
}

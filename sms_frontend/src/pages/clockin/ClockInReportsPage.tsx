import { useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type LogEntry = {
  id: number
  person_name: string
  person_type: string
  event_type: 'IN' | 'OUT'
  timestamp: string
  is_late: boolean
  device_location: string
}

export default function ClockInReportsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    person_type: 'ALL',
  })

  const loadReport = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: any = { date: filters.date }
      if (filters.person_type !== 'ALL') {
        params.person_type = filters.person_type
      }
      const res = await apiClient.get<LogEntry[]>('/clockin/events/', { params })
      setLogs(res.data)
    } catch {
      setError('Failed to load report.')
    } finally {
      setIsLoading(false)
    }
  }

  const stats = {
    totalScans: logs.length,
    uniquePeople: new Set(logs.map(l => l.person_name)).size,
    lateCount: logs.filter(l => l.is_late).length,
  }

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <PageHero
        badge="CLOCK-IN"
        badgeColor="emerald"
        title="Attendance Reports"
        subtitle="Staff and student attendance analytics"
        icon="⏰"
      />
      <header className="rounded-2xl glass-panel p-6">
        <h1 className="text-xl font-display font-semibold">Attendance Logs & Reports</h1>
        <p className="mt-2 text-sm text-slate-400">Detailed biometric scan logs for audit and compliance.</p>
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      </header>

      <section className="rounded-2xl glass-panel p-6 flex flex-wrap items-end gap-6 shadow-xl">
         <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Select Date</label>
            <input
              type="date"
              className="w-48 rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2 text-sm focus:border-emerald-500 transition outline-none"
              value={filters.date}
              onChange={e => setFilters({ ...filters, date: e.target.value })}
            />
         </div>
         <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Person Type</label>
            <select
              className="w-48 rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2 text-sm focus:border-emerald-500 transition outline-none"
              value={filters.person_type}
              onChange={e => setFilters({ ...filters, person_type: e.target.value as any })}
            >
              <option value="ALL">All Persons</option>
              <option value="STUDENT">Students Only</option>
              <option value="TEACHER">Teaching Staff</option>
              <option value="STAFF">Non-Teaching Staff</option>
            </select>
         </div>
         <button 
           onClick={loadReport}
           disabled={isLoading}
           className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50 transition uppercase tracking-widest"
         >
           {isLoading ? 'Loading...' : 'Load Report'}
         </button>
      </section>

      {logs.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Total Scans</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{stats.totalScans}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Unique Persons</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-400">{stats.uniquePeople}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Late Arrivals</p>
            <p className="mt-1 text-2xl font-semibold text-amber-400">{stats.lateCount}</p>
          </div>
        </section>
      )}

      <section className="rounded-2xl glass-panel overflow-hidden shadow-2xl">
         {isLoading ? (
           <div className="p-12 text-center text-slate-400">Loading audit trail...</div>
         ) : logs.length === 0 ? (
           <div className="p-12 text-center text-slate-500 italic">No biometric logs for this date.</div>
         ) : (
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead className="border-b border-white/[0.07] bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider text-xs">
                   <tr>
                      <th className="px-6 py-4">Scan Time</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4 text-center">Event</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Location</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                   {logs.map(log => (
                      <tr key={log.id} className="hover:bg-white/[0.025] transition group">
                         <td className="px-6 py-4 text-slate-100 font-mono text-xs italic">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                         </td>
                         <td className="px-6 py-4 font-display font-semibold text-slate-200">{log.person_name}</td>
                         <td className="px-6 py-4 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                               log.event_type === 'IN' ? 'bg-emerald-500 text-slate-900' : 'bg-rose-500 text-slate-900'
                            }`}>
                               {log.event_type}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase">
                               {log.person_type}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            {log.is_late ? (
                               <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">LATE ARRIVAL</span>
                            ) : (
                               <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 italic">ON TIME</span>
                            )}
                         </td>
                         <td className="px-6 py-4 text-slate-500 italic text-xs">{log.device_location}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
           </div>
         )}
      </section>
    </div>
  )
}

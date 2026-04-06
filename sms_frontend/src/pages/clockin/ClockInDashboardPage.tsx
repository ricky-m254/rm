import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { Users, Clock, AlertTriangle, TrendingUp, Fingerprint, Activity } from 'lucide-react'
import PageHero from '../../components/PageHero'

type DashboardData = {
  students_in: number
  students_late: number
  staff_in: number
  staff_late: number
  recent_events: Array<{
    id: number
    person_name: string
    person_type: string
    event_type: 'IN' | 'OUT'
    timestamp: string
    is_late: boolean
  }>
}

type RealtimeData = {
  name: string
  role: string
  person_type: string
  time_in: string
}

export default function ClockInDashboardPage() {
  const [data, setData] = useState<DashboardData>({
    students_in: 0,
    students_late: 0,
    staff_in: 0,
    staff_late: 0,
    recent_events: [],
  })
  const [realtime, setRealtime] = useState<RealtimeData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchData = async () => {
    try {
      const [dashRes, realRes] = await Promise.all([
        apiClient.get<DashboardData>('/clockin/dashboard/'),
        apiClient.get<RealtimeData[]>('/clockin/realtime/'),
      ])
      setData(dashRes.data)
      setRealtime(realRes.data)
      setError(null)
    } catch {
      setError('Live attendance data unavailable.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const kpis = [
    {
      label: 'Students Present',
      value: data.students_in,
      icon: Users,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.1)',
      sub: 'Clocked in today',
    },
    {
      label: 'Students Late',
      value: data.students_late,
      icon: AlertTriangle,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      sub: 'After 7:07 AM',
    },
    {
      label: 'Staff Present',
      value: data.staff_in,
      icon: Activity,
      color: '#38bdf8',
      bg: 'rgba(56,189,248,0.1)',
      sub: 'Teaching + support',
    },
    {
      label: 'Staff Late',
      value: data.staff_late,
      icon: TrendingUp,
      color: '#f87171',
      bg: 'rgba(248,113,113,0.1)',
      sub: 'Requires follow-up',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHero
        badge="CLOCK-IN"
        badgeColor="emerald"
        title="Dashboard"
        subtitle="Manage dashboard for this school"
        icon="⏰"
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Attendance Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Real-time biometric attendance monitoring</p>
          {error && <p className="mt-2 text-xs text-rose-300 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-mono font-bold text-white tabular-nums">
            {now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {now.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={15} style={{ color: k.color }} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">
              {isLoading ? <span className="text-slate-700 animate-pulse">—</span> : k.value}
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Currently in School */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <Users size={14} className="text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Currently in School</h2>
            <span className="ml-auto text-[10px] font-bold text-emerald-400 tabular-nums">{realtime.length}</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto" />
              </div>
            ) : realtime.length === 0 ? (
              <div className="py-10 text-center">
                <Fingerprint size={28} className="text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-600">No one currently signed in</p>
              </div>
            ) : realtime.map((person, idx) => (
              <div key={idx} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                  style={{ background: person.person_type === 'STUDENT' ? 'rgba(16,185,129,0.25)' : 'rgba(56,189,248,0.25)' }}>
                  {person.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{person.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{person.role}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                    style={{ background: person.person_type === 'STUDENT' ? 'rgba(16,185,129,0.12)' : 'rgba(56,189,248,0.12)', color: person.person_type === 'STUDENT' ? '#34d399' : '#38bdf8' }}>
                    {person.person_type}
                  </span>
                  <p className="mt-1 text-[10px] text-slate-500 tabular-nums">
                    {new Date(person.time_in).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Scan Feed */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <Clock size={14} className="text-sky-400" />
            <h2 className="text-sm font-bold text-white">Recent Scan Feed</h2>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400/70">Live</span>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="w-8 h-8 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin mx-auto" />
              </div>
            ) : data.recent_events.length === 0 ? (
              <div className="py-10 text-center">
                <Activity size={28} className="text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-600">No recent scans</p>
              </div>
            ) : data.recent_events.map((event) => (
              <div key={event.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: event.event_type === 'IN' ? '#10b981' : '#f87171' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{event.person_name}</p>
                  <p className="text-[10px] text-slate-500 tabular-nums">
                    {new Date(event.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    <span className="mx-1 text-slate-700">·</span>
                    {event.person_type}
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {event.is_late && (
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold text-amber-400" style={{ background: 'rgba(245,158,11,0.1)' }}>LATE</span>
                  )}
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                    style={{
                      background: event.event_type === 'IN' ? 'rgba(16,185,129,0.12)' : 'rgba(248,113,113,0.12)',
                      color: event.event_type === 'IN' ? '#34d399' : '#f87171',
                    }}>
                    {event.event_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

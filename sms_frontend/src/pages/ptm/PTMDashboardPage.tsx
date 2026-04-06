import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { Calendar, Users, Clock, Plus, CheckCircle } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface PTMStats {
  total_sessions: number
  upcoming_session_count: number
  total_slots: number
  booked_slots: number
  available_slots: number
  upcoming_sessions: any[]
}

export default function PTMDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<PTMStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/ptm/dashboard/')
      .then(res => setStats(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-slate-400">Loading dashboard...</div>

  const bookingRate = (stats?.booked_slots ?? 0) / (stats?.total_slots || 1) * 100

  return (
    <div className="space-y-6">
      <PageHero
        badge="PTM"
        badgeColor="violet"
        title="P T M Dashboard"
        subtitle="Manage p t m dashboard for this school"
        icon="🤝"
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">PTM Dashboard</h1>
        <button onClick={() => navigate('/modules/ptm/sessions')} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition">
          <Plus className="h-4 w-4" />
          Create Session
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl glass-panel p-6">
          <div className="flex items-center justify-between">
            <Calendar className="h-8 w-8 text-emerald-400" />
            <span className="text-2xl font-bold text-white">{stats?.total_sessions ?? 0}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">Total Sessions</p>
          <p className="mt-1 text-xs text-slate-500">{stats?.upcoming_session_count ?? 0} upcoming</p>
        </div>
        <div className="rounded-2xl glass-panel p-6">
          <div className="flex items-center justify-between">
            <Users className="h-8 w-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">{stats?.booked_slots ?? 0}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">Booked Upcoming Slots</p>
        </div>
        <div className="rounded-2xl glass-panel p-6">
          <div className="flex items-center justify-between">
            <Clock className="h-8 w-8 text-orange-400" />
            <span className="text-2xl font-bold text-white">{stats?.available_slots ?? 0}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">Available Upcoming Slots</p>
        </div>
        <div className="rounded-2xl glass-panel p-6">
          <div className="flex items-center justify-between">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
            <span className="text-2xl font-bold text-white">{bookingRate.toFixed(1)}%</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">Upcoming Booking Rate</p>
        </div>
      </div>

      <div className="rounded-2xl glass-panel p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Upcoming Sessions</h3>
        {stats?.upcoming_sessions.length === 0 ? (
          <p className="text-slate-500 italic">No upcoming sessions scheduled.</p>
        ) : (
          <div className="space-y-4">
            {stats?.upcoming_sessions.map((session: any) => (
              <div key={session.id} className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-slate-950/40 p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">{session.title}</h4>
                    <p className="text-xs text-slate-500">{session.date} • {session.venue}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-sm font-medium text-emerald-400">{session.slot_duration_minutes} min slots</p>
                   <p className="text-xs text-slate-500">{session.start_time} - {session.end_time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

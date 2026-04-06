import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import { GraduationCap, Calendar, ClipboardList, Activity, BookOpen, ChevronRight } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type DashData = {
  student?: { first_name: string; last_name: string; admission_number: string; class_section?: string }
  kpis?: { attendance_rate: number | null; current_average_grade: string | null; pending_assignments: number; upcoming_events: number }
  recent_grades?: Array<{ subject: string; grade: string; assessment: string }>
  upcoming_assignments?: Array<{ title: string; due_date: string; subject: string }>
  announcements?: Array<{ title: string; created_at: string; content: string }>
}

export default function StudentPortalDashboardPage() {
  const username = useAuthStore(s => s.username)
  const [data, setData] = useState<DashData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    apiClient.get<DashData>('/student-portal/dashboard/')
      .then(res => { if (mounted) setData(res.data) })
      .catch(() => { if (mounted) setError('Unable to load your dashboard. Please try again.') })
    return () => { mounted = false }
  }, [])

  const studentName = data?.student
    ? `${data.student.first_name} ${data.student.last_name}`
    : username ?? 'Student'

  const quickLinks = [
    { label: 'My Grades', to: '/student-portal/grades', icon: GraduationCap, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Timetable', to: '/student-portal/timetable', icon: Calendar, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
    { label: 'Assignments', to: '/student-portal/assignments', icon: ClipboardList, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'E-Learning', to: '/student-portal/elearning', icon: BookOpen, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Attendance', to: '/student-portal/attendance', icon: Activity, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-8"
        style={{ background: 'linear-gradient(135deg, #0a1e30 0%, #070b12 60%, #0d0a1e 100%)' }}>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(ellipse at 80% 30%, rgba(14,165,233,0.5) 0%, transparent 55%), radial-gradient(ellipse at 10% 80%, rgba(16,185,129,0.3) 0%, transparent 50%)'
        }} />
        <div className="relative z-10">
          <p className="text-xs text-sky-400/70 font-semibold uppercase tracking-widest mb-1">Student Portal</p>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span style={{ color: '#38bdf8' }}>{studentName.split(' ')[0]}</span> 👋
          </h1>
          {data?.student && (
            <p className="text-slate-400 text-sm">
              Admission No: <span className="text-slate-300 font-mono">{data.student.admission_number}</span>
              {data.student.class_section && <span className="ml-3 text-slate-500">· {data.student.class_section}</span>}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Attendance', value: data?.kpis?.attendance_rate != null ? `${data.kpis.attendance_rate}%` : '—', color: '#10b981' },
          { label: 'Avg Grade', value: data?.kpis?.current_average_grade ?? '—', color: '#38bdf8' },
          { label: 'Pending Work', value: data?.kpis?.pending_assignments ?? '—', color: '#f59e0b' },
          { label: 'Upcoming Events', value: data?.kpis?.upcoming_events ?? '—', color: '#a78bfa' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={GLASS}>
            <p className="text-xl font-bold font-mono" style={{ color: k.color }}>{String(k.value)}</p>
            <p className="mt-0.5 text-xs text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {quickLinks.map(l => (
          <Link key={l.to} to={l.to}
            className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all hover:scale-[1.02]"
            style={GLASS}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: l.bg }}>
              <l.icon size={18} style={{ color: l.color }} />
            </div>
            <span className="text-xs font-medium text-slate-300">{l.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent grades */}
        <div className="rounded-2xl p-5" style={GLASS}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Recent Grades</h3>
            <Link to="/student-portal/grades" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
              All <ChevronRight size={12} />
            </Link>
          </div>
          {data?.recent_grades?.length ? (
            <div className="space-y-2">
              {data.recent_grades.slice(0, 5).map((g, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-300 font-medium">{g.subject}</p>
                    <p className="text-[10px] text-slate-500">{g.assessment}</p>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">{g.grade}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">No grades recorded yet.</p>
          )}
        </div>

        {/* Upcoming assignments */}
        <div className="rounded-2xl p-5" style={GLASS}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Due Soon</h3>
            <Link to="/student-portal/assignments" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              All <ChevronRight size={12} />
            </Link>
          </div>
          {data?.upcoming_assignments?.length ? (
            <div className="space-y-2">
              {data.upcoming_assignments.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-start justify-between text-sm gap-2">
                  <div className="min-w-0">
                    <p className="text-slate-300 font-medium truncate">{a.title}</p>
                    <p className="text-[10px] text-slate-500">{a.subject}</p>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono whitespace-nowrap">{a.due_date}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">No pending assignments.</p>
          )}
        </div>
      </div>

      {/* Announcements */}
      {data?.announcements && data.announcements.length > 0 && (
        <div className="rounded-2xl p-5" style={GLASS}>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">School Announcements</h3>
          <div className="space-y-3">
            {data.announcements.slice(0, 3).map((a, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                <p className="text-sm font-medium text-slate-200">{a.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.content}</p>
                <p className="text-[10px] text-slate-600 mt-1.5">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

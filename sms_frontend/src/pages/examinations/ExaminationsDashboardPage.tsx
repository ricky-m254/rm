import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import {
  ClipboardList, FileText, BarChart3, TrendingUp, Award,
  BookOpen, CheckCircle2,
} from 'lucide-react'

interface Analytics {
  class_average?: number
  pass_rate?: number
  top_students?: { student__first_name: string; student__last_name: string; avg_marks: number }[]
  subject_averages?: { subject_name: string; avg: number }[]
  total_sessions?: number
  total_papers?: number
  total_results?: number
}

interface Session { id: number; name: string; status: string; start_date: string; end_date: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v?.results) ? v.results! : []
}

const passColor = (rate?: number) => {
  if (!rate) return '#94a3b8'
  if (rate >= 80) return '#10b981'
  if (rate >= 60) return '#fbbf24'
  return '#f87171'
}

export default function ExaminationsDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiClient.get('/examinations/analytics/').catch(() => ({ data: {} })),
      apiClient.get('/examinations/sessions/').catch(() => ({ data: [] })),
    ]).then(([aRes, sRes]) => {
      setAnalytics(aRes.data as Analytics)
      setSessions(asArray(sRes.data as Session[] | { results?: Session[] }))
    }).finally(() => setLoading(false))
  }, [])

  const pass = analytics?.pass_rate ?? 0
  const avg = analytics?.class_average ?? 0
  const circumference = 2 * Math.PI * 36
  const dashOffset = circumference - (pass / 100) * circumference

  return (
    <div className="p-6 space-y-6">
      <PageHero
        badge="EXAMINATIONS"
        badgeColor="amber"
        title="Dashboard"
        subtitle="Manage dashboard for this school"
        icon="📝"
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Examinations</h1>
        <p className="text-slate-400 text-sm mt-0.5">Overview of exam sessions, papers, results and performance</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sessions',      value: analytics?.total_sessions ?? sessions.length, icon: ClipboardList, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
          { label: 'Papers',        value: analytics?.total_papers ?? 0,                 icon: FileText,      color: '#38bdf8', bg: 'rgba(56,189,248,0.1)'  },
          { label: 'Results In',    value: analytics?.total_results ?? 0,                icon: BarChart3,     color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
          { label: 'Class Avg',     value: loading ? '…' : `${avg}%`,                   icon: TrendingUp,    color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-3 right-3 w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={13} style={{ color: k.color }} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{loading ? '…' : k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Pass rate ring + subject averages */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Pass rate ring */}
        <div className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pass Rate</p>
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle cx="48" cy="48" r="36" fill="none" stroke={passColor(pass)} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={loading ? circumference : dashOffset}
              strokeLinecap="round" transform="rotate(-90 48 48)"
              style={{ transition: 'stroke-dashoffset 1s ease' }} />
            <text x="48" y="53" textAnchor="middle" className="text-lg font-bold" fill="white" fontSize="18" fontWeight="700">
              {loading ? '…' : `${pass}%`}
            </text>
          </svg>
          <p className="text-xs text-slate-500">overall pass rate</p>
        </div>

        {/* Subject averages */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><BookOpen size={11} /> Subject Averages</p>
          {loading ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : (analytics?.subject_averages?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-600">No subject data yet — enter results to see averages.</p>
          ) : (
            <div className="space-y-2">
              {analytics!.subject_averages!.map(s => (
                <div key={s.subject_name} className="flex items-center gap-3">
                  <p className="text-xs text-slate-400 w-28 truncate">{s.subject_name}</p>
                  <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${s.avg}%`, background: passColor(s.avg) }} />
                  </div>
                  <p className="text-xs font-bold tabular-nums" style={{ color: passColor(s.avg) }}>{s.avg}%</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top students + sessions */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Top students */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <Award size={13} className="text-amber-400" />
            <p className="text-sm font-bold text-white">Top Students</p>
          </div>
          <table className="w-full">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">Student</th>
              <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Avg Marks</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-sm text-slate-600">Loading…</td></tr>
              ) : (analytics?.top_students?.length ?? 0) === 0 ? (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-sm text-slate-600">No results recorded yet.</td></tr>
              ) : analytics!.top_students!.map((s, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 text-sm text-slate-200">{s.student__first_name} {s.student__last_name}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold tabular-nums" style={{ color: passColor(s.avg_marks) }}>{s.avg_marks}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Exam sessions */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <ClipboardList size={13} className="text-violet-400" />
            <p className="text-sm font-bold text-white">Exam Sessions</p>
          </div>
          {loading ? (
            <p className="px-5 py-8 text-sm text-slate-600">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-600">No exam sessions yet.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {sessions.slice(0, 5).map(s => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition">
                  <div>
                    <p className="text-sm text-slate-200 font-medium">{s.name}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{s.start_date} → {s.end_date}</p>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                    style={{
                      background: s.status === 'Ongoing' ? 'rgba(56,189,248,0.1)' : s.status === 'Completed' ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                      color: s.status === 'Ongoing' ? '#38bdf8' : s.status === 'Completed' ? '#10b981' : '#94a3b8',
                    }}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CBC Competency Level quick-ref */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><CheckCircle2 size={11} /> CBC Competency Level Reference</p>
        <div className="flex flex-wrap gap-2">
          {[
            { grade: 'EE',  range: '80–100', label: 'Exceeds Expectation', color: '#10b981' },
            { grade: 'ME',  range: '60–79',  label: 'Meets Expectation',   color: '#34d399' },
            { grade: 'AE',  range: '40–59',  label: 'Approaches Expectation', color: '#fbbf24' },
            { grade: 'BE',  range: '0–39',   label: 'Below Expectation',   color: '#f87171' },
          ].map(g => (
            <div key={g.grade} className="rounded-xl px-4 py-3 flex flex-col items-center min-w-[120px] flex-1"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${g.color}30` }}>
              <span className="text-xl font-bold" style={{ color: g.color }}>{g.grade}</span>
              <span className="text-[10px] font-semibold mt-1" style={{ color: g.color }}>{g.range}%</span>
              <span className="text-[9px] text-slate-400 text-center mt-0.5 leading-tight">{g.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 mt-3">CBC (Competency Based Curriculum) — Kenya Institute of Curriculum Development (KICD) standards · PP1 to Grade 9</p>
      </div>

    </div>
  )
}

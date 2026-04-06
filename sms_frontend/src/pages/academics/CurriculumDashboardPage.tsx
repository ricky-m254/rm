import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import {
  BookOpen, FileText, Layers, Package, ChevronRight,
  GraduationCap, Star, Clock, CheckCircle2, TrendingUp,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

interface Stats {
  total_schemes: number
  total_lessons: number
  topics_covered: number
  total_resources: number
}

const SUBJ_COLORS = ['#3b82f6','#10b981','#22c55e','#a855f7','#0ea5e9','#f97316','#f43f5e','#f59e0b','#38bdf8','#84cc16']

type SubjectItem = {
  id: number; name: string; code?: string; subject_code?: string
  lesson_count?: number; topic_count?: number
}

function asArr<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function CurriculumDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [subjects, setSubjects] = useState<SubjectItem[]>([])

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/curriculum/dashboard/'),
      apiClient.get('/academics/subjects/', { params: { limit: 6 } }),
    ]).then(([statsRes, subjRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (subjRes.status === 'fulfilled') setSubjects(asArr<SubjectItem>(subjRes.value.data))
    })
  }, [])

  const kpis = [
    { label: 'Schemes of Work', value: stats?.total_schemes ?? 12, icon: Layers, color: '#10b981', bg: 'rgba(16,185,129,0.12)', sub: 'All subjects, all forms' },
    { label: 'Lesson Plans', value: stats?.total_lessons ?? 124, icon: FileText, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', sub: 'Weekly lessons' },
    { label: 'Topics Covered', value: stats?.topics_covered ?? 88, icon: CheckCircle2, color: '#a855f7', bg: 'rgba(168,85,247,0.12)', sub: 'This term' },
    { label: 'Learning Resources', value: stats?.total_resources ?? 240, icon: Package, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', sub: 'PDFs, videos, e-books' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0e1a18 0%, #0e142e 45%, #1a1a0e 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 78% 45%, rgba(16,185,129,0.5) 0%, transparent 55%), radial-gradient(ellipse at 18% 75%, rgba(59,130,246,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.35)' }}>
                CURRICULUM · CBC KENYA
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <GraduationCap size={11} />
                Term 1 2025 Active
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Curriculum &<br />
              <span style={{ color: '#34d399' }}>Academic Planning</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              Schemes of work, lesson plans, and CBC-aligned learning resources for all subjects across all forms.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:min-w-[240px]">
            {[
              { label: 'Schemes', value: String(stats?.total_schemes ?? 12), color: '#10b981' },
              { label: 'Lessons', value: String(stats?.total_lessons ?? 124), color: '#0ea5e9' },
              { label: 'Topics', value: String(stats?.topics_covered ?? 88), color: '#a855f7' },
              { label: 'Resources', value: String(stats?.total_resources ?? 240), color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-xl font-bold text-white">{item.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden" style={GLASS}>
            <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
            <p className="text-[10px] mt-1 font-medium" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Subjects + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Subject coverage */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen size={13} className="text-emerald-400" /> Subject Coverage — Term 1 2025
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5">
            {subjects.length === 0 ? (
              <p className="col-span-2 py-8 text-center text-sm text-slate-500">No subjects found.</p>
            ) : subjects.slice(0, 6).map((subj, idx) => {
              const lessons = subj.lesson_count ?? 0
              const topics = subj.topic_count ?? 0
              const pct = lessons > 0 ? Math.round((topics / lessons) * 100) : 0
              const color = SUBJ_COLORS[idx % SUBJ_COLORS.length]
              const code = subj.code ?? subj.subject_code ?? ''
              return (
                <div key={subj.id} className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{subj.name}</p>
                      <p className="text-[10px] text-slate-500">{code && `${code} · `}{lessons} lessons · {topics} topics covered</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={13} className="text-emerald-400" />
              <p className="text-xs font-bold text-emerald-300">Term Progress</p>
            </div>
            {[
              { label: 'Week', value: '8 of 14', icon: Clock },
              { label: 'Topics on schedule', value: '88%', icon: CheckCircle2 },
              { label: 'Avg lessons/week', value: '28', icon: Star },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="flex items-center gap-1.5 text-xs text-slate-400"><Icon size={10} />{label}</span>
                <span className="text-xs font-bold text-white">{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4" style={GLASS}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'Schemes of Work', route: '/modules/curriculum/schemes' },
                { label: 'Lesson Plans', route: '/modules/curriculum/lessons' },
                { label: 'Learning Resources', route: '/modules/curriculum/resources' },
                { label: 'Timetable Grid', route: '/modules/timetable/grid' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.route)}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>{item.label}</span>
                  <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

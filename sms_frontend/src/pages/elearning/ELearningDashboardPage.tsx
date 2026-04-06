import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Play, Users, Monitor, ChevronRight, Clock, Star, TrendingUp, Award, Zap, Loader2 } from 'lucide-react'
import { apiClient } from '../../api/client'

interface Course {
  id: number
  title: string
  subject_name: string
  school_class_name: string
  teacher_name: string
  material_count: number
  is_published: boolean
}

interface UpcomingSession {
  id: number
  title: string
  course: string
  session_date: string
  start_time: string
  platform: string
  meeting_link: string
}

interface DashboardData {
  my_courses_count: number
  published_courses: number
  total_materials: number
  total_quizzes: number
  upcoming_sessions: UpcomingSession[]
}

const SUBJECT_COLORS: Record<string, { from: string; to: string; icon: string }> = {
  'Mathematics':                   { from: '#1d4ed8', to: '#3b82f6', icon: '∑' },
  'Biology':                       { from: '#166534', to: '#22c55e', icon: '🧬' },
  'Chemistry':                     { from: '#581c87', to: '#a855f7', icon: '⚗' },
  'Physics':                       { from: '#0c4a6e', to: '#0ea5e9', icon: '⚡' },
  'English':                       { from: '#065f46', to: '#10b981', icon: 'A' },
  'Kiswahili':                     { from: '#92400e', to: '#f59e0b', icon: 'K' },
  'History':                       { from: '#7c2d12', to: '#f97316', icon: '🏛' },
  'Geography':                     { from: '#14532d', to: '#84cc16', icon: '🌍' },
  'Computer Studies':              { from: '#1e1b4b', to: '#6366f1', icon: '💻' },
  'Business Studies':              { from: '#1e3a5f', to: '#64748b', icon: '💼' },
  'Agriculture':                   { from: '#052e16', to: '#16a34a', icon: '🌱' },
  'Christian Religious Education': { from: '#713f12', to: '#eab308', icon: '✝' },
}
const subjectColor = (name: string) =>
  SUBJECT_COLORS[name] ?? { from: '#1e293b', to: '#475569', icon: '📚' }

function GlassCard({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

function ProgressRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  )
}

export default function ELearningDashboardPage() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSubject, setActiveSubject] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiClient.get('/elearning/dashboard/'),
      apiClient.get('/elearning/courses/'),
    ]).then(([dashRes, coursesRes]) => {
      setDashboard(dashRes.data)
      const data = coursesRes.data
      setCourses(Array.isArray(data) ? data : data.results ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Build subject grid from real courses
  const subjectMap: Record<string, { name: string; count: number }> = {}
  courses.forEach(c => {
    if (!subjectMap[c.subject_name]) subjectMap[c.subject_name] = { name: c.subject_name, count: 0 }
    subjectMap[c.subject_name].count++
  })
  const subjects = Object.values(subjectMap).sort((a, b) => b.count - a.count)

  const featuredCourses = courses.slice(0, 3)
  const upcomingSessions = dashboard?.upcoming_sessions ?? []

  const stats = [
    { label: 'Published Courses', value: String(dashboard?.published_courses ?? courses.filter(c => c.is_published).length), sub: 'CBC-aligned', icon: BookOpen, color: '#10b981' },
    { label: 'Study Materials', value: String(dashboard?.total_materials ?? '…'), sub: 'Docs & videos', icon: Play, color: '#6366f1' },
    { label: 'Active Learners', value: String(courses.length > 0 ? '1,308' : '…'), sub: 'Enrolled students', icon: Users, color: '#f59e0b' },
    { label: 'Live Sessions', value: String(upcomingSessions.length), sub: 'Upcoming this week', icon: Monitor, color: '#0ea5e9' },
  ]

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-10 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #0a3d2e 100%)' }}
      >
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(16,185,129,0.4) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(99,102,241,0.3) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center flex-wrap gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                CBC KENYA · TERM 1 2026
              </span>
              {upcomingSessions.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {upcomingSessions.length} Upcoming Sessions
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              St. Mary's Digital<br />
              <span style={{ color: '#34d399' }}>Learning Platform</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm md:text-base">
              Kenya CBC-aligned courses, learning materials, e-books, and live virtual sessions — all in one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => navigate('/modules/elearning/courses')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90" style={{ background: '#10b981', color: '#fff' }}>
                <Play size={15} /> Start Learning
              </button>
              <button onClick={() => navigate('/modules/elearning/sessions')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Monitor size={15} /> Join Live Class
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-60 flex-shrink-0">
            {loading ? (
              <div className="col-span-2 flex items-center justify-center py-8">
                <Loader2 size={24} className="text-emerald-400 animate-spin" />
              </div>
            ) : [
              { v: String(courses.filter(c => c.is_published).length), l: 'Courses', c: '#10b981' },
              { v: String(dashboard?.total_materials ?? 0), l: 'Materials', c: '#6366f1' },
              { v: String(subjects.length), l: 'Subjects', c: '#f59e0b' },
              { v: String(upcomingSessions.length), l: 'Sessions', c: '#0ea5e9' },
            ].map(x => (
              <div key={x.l} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-2xl font-bold" style={{ color: x.c }}>{x.v}</p>
                <p className="text-xs text-slate-400 mt-0.5">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <GlassCard key={s.label} className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                <Icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-white">{loading ? '…' : s.value}</p>
                <p className="text-xs font-medium text-slate-400">{s.label}</p>
                <p className="text-xs text-slate-500">{s.sub}</p>
              </div>
            </GlassCard>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Featured Courses */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" /> Continue Learning
            </h2>
            <button onClick={() => navigate('/modules/elearning/courses')} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">All Courses <ChevronRight size={14} /></button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="text-emerald-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {featuredCourses.map(c => {
                const { from, to } = subjectColor(c.subject_name)
                return (
                  <GlassCard key={c.id} className="hover:border-emerald-500/30 transition-all" onClick={() => navigate('/modules/elearning/materials')}>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                      >
                        {c.subject_name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: to }}>{c.subject_name}</p>
                        <p className="text-sm font-bold text-white mt-0.5 truncate">{c.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{c.teacher_name}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-700">
                            <div className="h-full rounded-full transition-all" style={{ width: '65%', background: to }} />
                          </div>
                          <span className="text-xs font-bold text-slate-300">{c.material_count} materials</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <ProgressRing pct={65} color={to} />
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <Star size={10} fill="#f59e0b" /> 4.8
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className="space-y-4">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Zap size={18} className="text-amber-400" /> Virtual Sessions
          </h2>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="text-amber-400 animate-spin" />
              </div>
            ) : upcomingSessions.length === 0 ? (
              <GlassCard className="p-6 text-center">
                <Monitor size={32} className="mx-auto text-slate-600 mb-2" />
                <p className="text-slate-400 text-sm">No upcoming sessions</p>
              </GlassCard>
            ) : upcomingSessions.slice(0, 4).map((s, i) => (
              <GlassCard key={i}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>Soon</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{s.title}</p>
                    <p className="text-xs text-slate-400 truncate">{s.course} · {s.platform}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={11} /> {s.session_date} {s.start_time?.slice(0, 5)}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* CBC Subject Grid */}
      <div>
        <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
          <Award size={18} className="text-emerald-400" /> CBC Subject Library
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {subjects.map(sub => {
              const { from, to, icon } = subjectColor(sub.name)
              const isActive = activeSubject === sub.name
              return (
                <button
                  key={sub.name}
                  onClick={() => setActiveSubject(isActive ? null : sub.name)}
                  className="rounded-2xl p-4 text-left transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${from}, ${to})`
                      : `linear-gradient(135deg, ${from}30, ${to}20)`,
                    border: `1px solid ${isActive ? to : to + '30'}`,
                  }}
                >
                  <span className="text-2xl block mb-2">{icon}</span>
                  <p className="text-xs font-bold text-white leading-tight">{sub.name}</p>
                  <p className="text-xs mt-1" style={{ color: to }}>{sub.count} course{sub.count !== 1 ? 's' : ''}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Materials */}
      {!loading && dashboard && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <BookOpen size={18} className="text-emerald-400" /> Platform Stats
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Quizzes', value: dashboard.total_quizzes, color: '#6366f1' },
              { label: 'Study Materials', value: dashboard.total_materials, color: '#10b981' },
              { label: 'Upcoming Sessions', value: upcomingSessions.length, color: '#f59e0b' },
              { label: 'Subjects Covered', value: subjects.length, color: '#0ea5e9' },
            ].map(s => (
              <GlassCard key={s.label} className="p-4 text-center">
                <p className="text-3xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

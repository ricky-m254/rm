import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, BookOpen, Clock, Star, Play, ChevronRight, Loader2 } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

interface Course {
  id: number
  title: string
  description: string
  subject_name: string
  school_class_name: string
  teacher_name: string
  material_count: number
  is_published: boolean
  created_at: string
}

const SUBJECT_COLORS: Record<string, { from: string; to: string }> = {
  'Mathematics':                   { from: '#1d4ed8', to: '#3b82f6' },
  'Biology':                       { from: '#166534', to: '#22c55e' },
  'Chemistry':                     { from: '#581c87', to: '#a855f7' },
  'Physics':                       { from: '#0c4a6e', to: '#0ea5e9' },
  'English':                       { from: '#065f46', to: '#10b981' },
  'Kiswahili':                     { from: '#92400e', to: '#f59e0b' },
  'History':                       { from: '#7c2d12', to: '#f97316' },
  'Geography':                     { from: '#14532d', to: '#84cc16' },
  'Computer Studies':              { from: '#1e1b4b', to: '#6366f1' },
  'Business Studies':              { from: '#1e3a5f', to: '#64748b' },
  'Agriculture':                   { from: '#052e16', to: '#16a34a' },
  'Christian Religious Education': { from: '#713f12', to: '#eab308' },
}
const subjectColor = (name: string) =>
  SUBJECT_COLORS[name] ?? { from: '#1e293b', to: '#475569' }

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {children}
    </div>
  )
}

export default function ELearningCoursesPage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    apiClient.get('/elearning/courses/')
      .then(r => {
        const data = r.data
        setCourses(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false))
  }, [])

  const subjects = ['All', ...Array.from(new Set(courses.map(c => c.subject_name))).sort()]

  const filtered = courses.filter(c => {
    const matchSubject = filter === 'All' || c.subject_name === filter
    const matchSearch = search === '' ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.teacher_name.toLowerCase().includes(search.toLowerCase())
    return matchSubject && matchSearch
  })

  return (
    <div className="space-y-6">
      <PageHero
        badge="E-LEARNING"
        badgeColor="violet"
        title="Course Library"
        subtitle="Browse and manage CBC subject courses"
        icon="🎓"
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Courses</h1>
          <p className="text-slate-400 text-sm mt-1">Kenya CBC-aligned courses for Forms 1–4</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            {loading ? '…' : filtered.length} Courses
          </span>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search courses, teachers…"
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {subjects.map(f => (
            <button
              key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={filter === f
                ? { background: '#10b981', color: '#fff' }
                : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-emerald-500 animate-spin" />
        </div>
      )}

      {/* Course Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <GlassCard className="col-span-full p-10 text-center">
              <BookOpen size={40} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">No courses found</p>
            </GlassCard>
          ) : filtered.map(c => {
            const { from, to } = subjectColor(c.subject_name)
            return (
              <div
                key={c.id}
                className="rounded-2xl border overflow-hidden transition-all hover:scale-[1.01] hover:border-slate-600 cursor-pointer group"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                {/* Subject Header */}
                <div
                  className="h-24 relative flex items-end px-5 pb-4"
                  style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                >
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='2' fill='white' opacity='0.3'/%3E%3C/svg%3E\")" }}
                  />
                  <div className="flex items-end justify-between w-full">
                    <div>
                      <p className="text-xs font-bold text-white/70 uppercase tracking-wider">{c.subject_name}</p>
                      <p className="text-sm font-bold text-white leading-tight">{c.school_class_name}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play size={16} className="text-white" />
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="p-5">
                  <p className="text-sm font-bold text-white leading-snug group-hover:text-emerald-300 transition-colors">{c.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{c.teacher_name}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><BookOpen size={12} /> {c.material_count} materials</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> CBC</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {c.school_class_name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {c.is_published && (
                      <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>Published</span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}>CBC</span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1 text-xs text-amber-400">
                      <Star size={12} fill="#f59e0b" /> <span>4.8</span>
                    </div>
                    <button
                      onClick={() => navigate('/modules/elearning/materials')}
                      className="flex items-center gap-1 text-xs font-semibold transition-colors hover:text-emerald-300"
                      style={{ color: '#10b981' }}
                    >
                      Start <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

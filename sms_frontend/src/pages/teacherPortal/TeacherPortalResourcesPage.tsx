import { useEffect, useState } from 'react'
import PageHero from '../../components/PageHero'
import { FileText, Video, Link2, FileImage, Upload, ExternalLink, Trash2, Plus, AlertCircle } from 'lucide-react'
import { apiClient } from '../../api/client'
import { resolveFileUrl } from '../../api/baseUrl'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type ResourceType = 'document' | 'video' | 'link' | 'slide'
type CourseOption = { id: number; title: string; subject: string; class_name: string }
type Resource = {
  id: number
  title: string
  type: ResourceType | string
  subject: string
  url: string
  description: string
  created_at: string
  course_id: number
  course_title: string
}

type ResourcesPayload = {
  courses: CourseOption[]
  materials: Resource[]
}

const TYPE_CONFIG = {
  document: { label: 'Document', icon: FileText, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
  video: { label: 'Video', icon: Video, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  link: { label: 'Link', icon: Link2, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  slide: { label: 'Slides', icon: FileImage, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
} satisfies Record<ResourceType, { label: string; icon: typeof FileText; color: string; bg: string }>

export default function TeacherPortalResourcesPage() {
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [form, setForm] = useState({
    course: '',
    title: '',
    type: 'document' as ResourceType,
    url: '',
    description: '',
  })
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<ResourcesPayload>('/teacher-portal/resources/')
      const nextCourses = response.data.courses ?? []
      setCourses(nextCourses)
      setResources(response.data.materials ?? [])
      setForm(prev => ({
        ...prev,
        course: prev.course || String(nextCourses[0]?.id ?? ''),
      }))
    } catch {
      setCourses([])
      setResources([])
      setError('Unable to load learning resources.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const subjects = ['all', ...Array.from(new Set(resources.map(r => r.subject).filter(Boolean))).sort()]

  const filtered = resources.filter(r => {
    const matchType = filter === 'all' || r.type === filter
    const matchSubject = subjectFilter === 'all' || r.subject === subjectFilter
    const matchCourse = courseFilter === 'all' || String(r.course_id) === courseFilter
    return matchType && matchSubject && matchCourse
  })

  const save = async () => {
    if (!form.title.trim() || !form.course) return
    setError(null)
    try {
      const response = await apiClient.post<Resource>('/teacher-portal/resources/', {
        course: Number(form.course),
        title: form.title,
        type: form.type,
        url: form.url,
        description: form.description,
      })
      setResources(prev => [response.data, ...prev])
      setForm({
        course: form.course,
        title: '',
        type: 'document',
        url: '',
        description: '',
      })
      setShowForm(false)
      setNotice('Resource added successfully.')
      setTimeout(() => setNotice(null), 3000)
    } catch {
      setError('Failed to add resource.')
    }
  }

  const remove = async (id: number) => {
    setError(null)
    try {
      await apiClient.delete(`/teacher-portal/resources/${id}/`)
      setResources(prev => prev.filter(r => r.id !== id))
    } catch {
      setError('Failed to delete resource.')
    }
  }

  const handleOpen = (url: string) => {
    if (!url) return
    window.open(resolveFileUrl(url), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      <PageHero badge="TEACHER" badgeColor="purple" title="Learning Resources" subtitle="Upload and share teaching materials with students" icon="LR" />

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(TYPE_CONFIG) as [ResourceType, typeof TYPE_CONFIG[ResourceType]][]).map(([type, cfg]) => (
          <div key={type} className="rounded-2xl p-4" style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
            <div className="flex items-center justify-between mb-1">
              <cfg.icon size={14} style={{ color: cfg.color }} />
              <span className="text-xs text-slate-500">{cfg.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{resources.filter(r => r.type === type).length}</p>
          </div>
        ))}
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-xs text-white outline-none">
            <option value="all">All types</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
            className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-xs text-white outline-none">
            <option value="all">All subjects</option>
            {subjects.filter(Boolean).map(s => <option key={s} value={s}>{s === 'all' ? 'All subjects' : s}</option>)}
          </select>
          <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
            className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-xs text-white outline-none">
            <option value="all">All courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)} disabled={courses.length === 0}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition disabled:opacity-40">
          <Plus size={14} /> Upload Resource
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-5" style={GLASS}>
          <p className="text-sm font-bold text-white mb-4">Add New Resource</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={form.course} onChange={e => setForm(p => ({ ...p, course: e.target.value }))}
              className="sm:col-span-2 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none">
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}{course.class_name ? ` - ${course.class_name}` : ''}
                </option>
              ))}
            </select>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Resource title *"
              className="sm:col-span-2 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none" />
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as ResourceType }))}
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none">
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="URL or file link"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none" />
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)"
              rows={2}
              className="sm:col-span-2 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none resize-none" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={!form.title.trim() || !form.course}
              className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-violet-500 transition">
              <Upload size={13} className="inline mr-1.5" />Add Resource
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:text-slate-300 transition">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-slate-500 py-10">Loading resources...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-10">No resources found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(r => {
            const cfg = TYPE_CONFIG[(r.type in TYPE_CONFIG ? r.type : 'document') as ResourceType]
            return (
              <div key={r.id} className="rounded-2xl p-5 group hover:scale-[1.01] transition-all" style={GLASS}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                      <cfg.icon size={16} style={{ color: cfg.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{r.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-400"
                          style={{ background: 'rgba(255,255,255,0.05)' }}>{r.subject}</span>
                        <span className="text-[10px] text-slate-600">{r.course_title}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => void remove(r.id)}
                    className="opacity-0 group-hover:opacity-100 transition rounded-lg p-1.5 text-slate-600 hover:text-rose-400"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                {r.description && <p className="text-xs text-slate-400 mb-3">{r.description}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-600">{r.created_at}</p>
                  {r.url && (
                    <button onClick={() => handleOpen(r.url)}
                      className="flex items-center gap-1 text-[11px] font-semibold transition"
                      style={{ color: cfg.color }}>
                      Open <ExternalLink size={10} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

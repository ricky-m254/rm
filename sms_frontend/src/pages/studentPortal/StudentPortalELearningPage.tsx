import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { BookOpen, FileText, Video, Link2, Download } from 'lucide-react'
import { resolveFileUrl } from '../../api/baseUrl'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Material = {
  id: number
  title: string
  subject: string
  type: 'PDF' | 'VIDEO' | 'LINK' | 'DOCUMENT' | string
  description: string | null
  file_url: string | null
  external_url: string | null
  created_at: string
  grade_level: string | null
}

const TYPE_ICON: Record<string, React.ElementType> = {
  PDF: FileText,
  VIDEO: Video,
  LINK: Link2,
  DOCUMENT: FileText,
}

const TYPE_COLOR: Record<string, string> = {
  PDF: '#ef4444',
  VIDEO: '#8b5cf6',
  LINK: '#0ea5e9',
  DOCUMENT: '#f59e0b',
}

export default function StudentPortalELearningPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('All')

  useEffect(() => {
    let mounted = true
    apiClient.get<{ materials: Material[] } | Material[]>('/student-portal/elearning/')
      .then(res => {
        if (!mounted) return
        const raw = res.data
        setMaterials(Array.isArray(raw) ? raw : (raw.materials ?? []))
        setIsLoading(false)
      })
      .catch(() => {
        if (mounted) { setError('Unable to load learning materials.'); setIsLoading(false) }
      })
    return () => { mounted = false }
  }, [])

  const subjects = ['All', ...Array.from(new Set(materials.map(m => m.subject))).sort()]

  const filtered = materials.filter(m => {
    const matchSub = subjectFilter === 'All' || m.subject === subjectFilter
    const matchSearch = !search.trim() || `${m.title} ${m.subject} ${m.description ?? ''}`.toLowerCase().includes(search.toLowerCase())
    return matchSub && matchSearch
  })

  const handleOpen = (m: Material) => {
    const raw = m.external_url || m.file_url
    if (!raw) return
    window.open(resolveFileUrl(raw), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">E-Learning</h1>
        <p className="text-slate-500 text-sm mt-1">CBC learning materials, videos, and resources</p>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search materials…"
          className="flex-1 min-w-[180px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <select
          value={subjectFilter}
          onChange={e => setSubjectFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2.5 text-sm text-slate-300"
        >
          {subjects.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Loading materials…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={GLASS}>
          <BookOpen className="mx-auto mb-3 text-slate-600" size={32} />
          <p className="text-slate-400 text-sm">No materials found.</p>
          <p className="text-slate-600 text-xs mt-1">Try a different search or subject filter.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(m => {
            const Icon = TYPE_ICON[m.type] ?? FileText
            const color = TYPE_COLOR[m.type] ?? '#94a3b8'
            const hasLink = !!(m.external_url || m.file_url)
            return (
              <div key={m.id} className="rounded-2xl p-5 flex gap-4" style={GLASS}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-200 text-sm leading-tight">{m.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500">{m.subject}</span>
                    {m.grade_level && <span className="text-[10px] text-slate-600">· {m.grade_level}</span>}
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ color, background: `${color}15` }}>
                      {m.type}
                    </span>
                  </div>
                  {m.description && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{m.description}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleOpen(m)}
                      disabled={!hasLink}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all
                        ${hasLink ? 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}
                    >
                      {m.type === 'VIDEO' ? <Video size={11} /> : m.type === 'LINK' ? <Link2 size={11} /> : <Download size={11} />}
                      {m.type === 'VIDEO' ? 'Watch' : m.type === 'LINK' ? 'Open Link' : 'Download'}
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

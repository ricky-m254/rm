import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Assignment = {
  id: number
  title: string
  subject: string
  description: string | null
  due_date: string | null
  status: 'PENDING' | 'SUBMITTED' | 'GRADED' | string
  submission_grade: string | null
  submission_date: string | null
  file_url: string | null
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-300',
  SUBMITTED: 'bg-blue-500/15 text-blue-300',
  GRADED: 'bg-emerald-500/15 text-emerald-300',
}

export default function StudentPortalAssignmentsPage() {
  const [items, setItems] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'SUBMITTED' | 'GRADED'>('all')

  useEffect(() => {
    let mounted = true
    apiClient.get<{ assignments: Assignment[] } | Assignment[]>('/student-portal/assignments/')
      .then(res => {
        if (!mounted) return
        const raw = res.data
        setItems(Array.isArray(raw) ? raw : (raw.assignments ?? []))
        setIsLoading(false)
      })
      .catch(() => {
        if (mounted) { setError('Unable to load assignments.'); setIsLoading(false) }
      })
    return () => { mounted = false }
  }, [])

  const filtered = filter === 'all' ? items : items.filter(a => a.status === filter)

  const counts = {
    all: items.length,
    PENDING: items.filter(a => a.status === 'PENDING').length,
    SUBMITTED: items.filter(a => a.status === 'SUBMITTED').length,
    GRADED: items.filter(a => a.status === 'GRADED').length,
  }

  const isOverdue = (d: string | null) => d && new Date(d) < new Date()

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Assignments</h1>
        <p className="text-slate-500 text-sm mt-1">Track your work and submissions</p>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {(['all', 'PENDING', 'SUBMITTED', 'GRADED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${filter === f ? 'bg-sky-500/20 text-sky-300' : 'text-slate-500 hover:text-slate-300'}`}>
            {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            <span className="ml-1.5 text-[10px] opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Loading assignments…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={GLASS}>
          <p className="text-slate-400 text-sm">No assignments in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="rounded-2xl p-5" style={GLASS}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLOR[a.status] ?? 'bg-white/10 text-slate-400'}`}>
                      {a.status}
                    </span>
                    {a.status === 'PENDING' && isOverdue(a.due_date) && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] bg-red-500/15 text-red-400">Overdue</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-200">{a.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{a.subject}</p>
                  {a.description && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{a.description}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {a.due_date && (
                    <div>
                      <p className="text-[10px] text-slate-600">Due</p>
                      <p className={`text-xs font-mono ${isOverdue(a.due_date) && a.status === 'PENDING' ? 'text-red-400' : 'text-slate-400'}`}>
                        {new Date(a.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {a.submission_grade && (
                    <div className="mt-1">
                      <p className="text-[10px] text-slate-600">Grade</p>
                      <p className="text-sm font-bold text-emerald-400">{a.submission_grade}</p>
                    </div>
                  )}
                </div>
              </div>
              {a.submission_date && (
                <p className="mt-2 text-[10px] text-slate-600">
                  Submitted: {new Date(a.submission_date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { getParentPortalErrorMessage } from './errors'

type Assignment = {
  id: number
  title: string
  subject?: string
  subject_name?: string
  class_name?: string
  due_date: string | null
  total_marks?: number
  description?: string
  status?: string
  submitted?: boolean
  score?: number | null
}

type Event = {
  id: number
  title: string
  event_type: string
  start_date: string
  end_date: string | null
  description?: string
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function ParentPortalAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, eRes] = await Promise.all([
          apiClient.get<Assignment[] | { results: Assignment[] }>('/parent-portal/assignments/'),
          apiClient.get<Event[] | { results: Event[] }>('/parent-portal/events/'),
        ])
        setAssignments(asArray(aRes.data))
        setEvents(asArray(eRes.data))
      } catch (err) {
        setError(getParentPortalErrorMessage(err, 'Unable to load assignments.'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Assignments & Events"
        subtitle="Track your child's pending assignments and upcoming school events."
        icon="📋"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Assignments ({assignments.length})</h2>
          {loading ? <p className="text-sm text-slate-400">Loading...</p> : (
            <div className="space-y-3">
              {assignments.map(a => {
                const days = daysUntil(a.due_date)
                const isOverdue = days !== null && days < 0
                const isDueSoon = days !== null && days >= 0 && days <= 2
                return (
                  <div key={a.id} className="rounded-xl glass-panel p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-100">{a.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {a.subject_name || a.subject || 'Assignment'}
                          {a.class_name ? ` · ${a.class_name}` : ''}
                        </p>
                      </div>
                      {days !== null ? (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isOverdue ? 'bg-rose-500/10 text-rose-400' : isDueSoon ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                        </span>
                      ) : null}
                    </div>
                    {a.description ? <p className="mt-2 text-xs text-slate-400 line-clamp-2">{a.description}</p> : null}
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      {a.due_date ? <span>Due: {new Date(a.due_date).toLocaleDateString()}</span> : null}
                      {a.total_marks ? <span>Marks: {a.total_marks}</span> : null}
                      {a.status ? <span>Status: {a.status}</span> : null}
                      {typeof a.score === 'number' ? <span>Score: {a.score}</span> : null}
                    </div>
                  </div>
                )
              })}
              {assignments.length === 0 ? <p className="rounded-xl glass-panel p-6 text-sm text-slate-500 text-center">No assignments found.</p> : null}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Upcoming Events ({events.length})</h2>
          {loading ? <p className="text-sm text-slate-400">Loading...</p> : (
            <div className="space-y-3">
              {events.map(e => (
                <div key={e.id} className="rounded-xl glass-panel p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-100">{e.title}</p>
                    <span className="shrink-0 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400">{e.event_type || 'Event'}</span>
                  </div>
                  {e.description ? <p className="mt-1 text-xs text-slate-400 line-clamp-2">{e.description}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(e.start_date).toLocaleDateString()}
                    {e.end_date ? ` - ${new Date(e.end_date).toLocaleDateString()}` : ''}
                  </p>
                </div>
              ))}
              {events.length === 0 ? <p className="rounded-xl glass-panel p-6 text-sm text-slate-500 text-center">No upcoming events.</p> : null}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

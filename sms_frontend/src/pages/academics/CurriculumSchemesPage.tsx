import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Subject = { id: number; name: string }
type SchoolClass = { id: number; name: string }
type Term = { id: number; name: string }
type Topic = { id: number; week_number: number; topic: string; is_covered: boolean }
type Scheme = { id: number; title: string; subject: number; subject_name?: string; school_class: number; school_class_name?: string; term: number; term_name?: string; objectives: string; topics: Topic[] }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function CurriculumSchemesPage() {
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [classId, setClassId] = useState('')
  const [termId, setTermId] = useState('')
  const [objectives, setObjectives] = useState('')
  const [saving, setSaving] = useState(false)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [topicText, setTopicText] = useState('')
  const [topicWeek, setTopicWeek] = useState('1')
  const [savingTopic, setSavingTopic] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Scheme | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, subRes, clRes, tRes] = await Promise.all([
        apiClient.get<Scheme[] | { results: Scheme[] }>('/curriculum/schemes/'),
        apiClient.get<Subject[] | { results: Subject[] }>('/academics/subjects/'),
        apiClient.get<SchoolClass[] | { results: SchoolClass[] }>('/academics/classes/'),
        apiClient.get<Term[] | { results: Term[] }>('/academics/terms/'),
      ])
      setSchemes(asArray(sRes.data)); setSubjects(asArray(subRes.data))
      setClasses(asArray(clRes.data)); setTerms(asArray(tRes.data))
    } catch { setError('Unable to load schemes of work.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!title.trim() || !subjectId || !classId || !termId) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/curriculum/schemes/', { title: title.trim(), subject: Number(subjectId), school_class: Number(classId), term: Number(termId), objectives })
      setTitle(''); setObjectives(''); setNotice('Scheme created.')
      await load()
    } catch { setError('Unable to create scheme.') }
    finally { setSaving(false) }
  }

  const addTopic = async (schemeId: number) => {
    if (!topicText.trim()) return
    setSavingTopic(true)
    try {
      await apiClient.post('/curriculum/topics/', { scheme: schemeId, week_number: Number(topicWeek), topic: topicText.trim() })
      setTopicText(''); setTopicWeek('1'); await load()
    } catch { setError('Unable to add topic.') }
    finally { setSavingTopic(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/curriculum/schemes/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete scheme.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ACADEMICS"
        badgeColor="blue"
        title="Schemes of Work"
        subtitle="Create and manage curriculum schemes with weekly topics."
        icon="📖"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="rounded-2xl glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">New Scheme of Work</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm lg:col-span-2" />
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option value="">Subject *</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={classId} onChange={e => setClassId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option value="">Class *</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={termId} onChange={e => setTermId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option value="">Term *</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <textarea value={objectives} onChange={e => setObjectives(e.target.value)} placeholder="Objectives" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3" />
        </div>
        <button onClick={save} disabled={saving || !title.trim() || !subjectId || !classId || !termId} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Create Scheme'}</button>
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-sm text-slate-400 px-2">Loading…</p> : schemes.map(sc => (
          <div key={sc.id} className="rounded-2xl glass-panel">
            <div className="flex items-start justify-between gap-4 p-4">
              <div>
                <p className="font-semibold text-slate-100">{sc.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">{sc.subject_name} · {sc.school_class_name} · {sc.term_name}</p>
                <p className="mt-1 text-xs text-slate-500">{sc.topics?.length ?? 0} topics</p>
              </div>
              <div className="flex shrink-0 gap-3 text-xs">
                <button onClick={() => setExpandedId(expandedId === sc.id ? null : sc.id)} className="font-semibold text-sky-400 hover:text-sky-300">{expandedId === sc.id ? 'Close' : 'Topics'}</button>
                <button onClick={() => setDeleteTarget(sc)} className="font-semibold text-rose-400 hover:text-rose-300">Delete</button>
              </div>
            </div>
            {expandedId === sc.id ? (
              <div className="border-t border-white/[0.07] p-4">
                <div className="flex gap-2 mb-3">
                  <input type="number" value={topicWeek} onChange={e => setTopicWeek(e.target.value)} placeholder="Wk" min={1} className="w-16 rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-sm" />
                  <input value={topicText} onChange={e => setTopicText(e.target.value)} placeholder="Topic name" className="flex-1 rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-sm" />
                  <button onClick={() => addTopic(sc.id)} disabled={savingTopic || !topicText.trim()} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-50">Add</button>
                </div>
                <div className="space-y-1">
                  {(sc.topics ?? []).sort((a, b) => a.week_number - b.week_number).map(t => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
                      <span className="w-12 shrink-0 text-slate-500">Wk {t.week_number}</span>
                      <span className={t.is_covered ? 'line-through text-slate-500' : ''}>{t.topic}</span>
                      {t.is_covered ? <span className="ml-auto text-[10px] text-emerald-400">Covered</span> : null}
                    </div>
                  ))}
                  {(sc.topics ?? []).length === 0 ? <p className="text-xs text-slate-500">No topics yet.</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {!loading && schemes.length === 0 ? <p className="text-sm text-slate-500 px-2">No schemes found. Create one above.</p> : null}
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Scheme" description={`Delete "${deleteTarget?.title}"? All topics will be removed.`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

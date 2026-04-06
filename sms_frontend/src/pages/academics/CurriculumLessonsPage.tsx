import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Topic = { id: number; topic: string; week_number: number; scheme_title?: string }
type LessonPlan = { id: number; topic: number; topic_name?: string; date: string; lesson_objectives: string; introduction: string; conclusion: string; assessment_activity: string; homework: string; is_approved: boolean }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function CurriculumLessonsPage() {
  const [lessons, setLessons] = useState<LessonPlan[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [topicId, setTopicId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [objectives, setObjectives] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [assessment, setAssessment] = useState('')
  const [homework, setHomework] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<LessonPlan | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [lRes, tRes] = await Promise.all([
        apiClient.get<LessonPlan[] | { results: LessonPlan[] }>('/curriculum/lessons/'),
        apiClient.get<Topic[] | { results: Topic[] }>('/curriculum/topics/'),
      ])
      setLessons(asArray(lRes.data)); setTopics(asArray(tRes.data))
    } catch { setError('Unable to load lesson plans.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!topicId || !date || !objectives.trim()) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/curriculum/lessons/', { topic: Number(topicId), date, lesson_objectives: objectives, introduction, conclusion, assessment_activity: assessment, homework })
      setTopicId(''); setObjectives(''); setIntroduction(''); setConclusion(''); setAssessment(''); setHomework('')
      setNotice('Lesson plan created.')
      await load()
    } catch { setError('Unable to create lesson plan.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/curriculum/lessons/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete lesson plan.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ACADEMICS"
        badgeColor="blue"
        title="Lesson Plans"
        subtitle="Create detailed lesson plans linked to scheme topics."
        icon="📖"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="rounded-2xl glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">New Lesson Plan</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={topicId} onChange={e => setTopicId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option value="">Select topic *</option>
            {topics.map(t => <option key={t.id} value={t.id}>Wk {t.week_number}: {t.topic}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <textarea value={objectives} onChange={e => setObjectives(e.target.value)} placeholder="Lesson objectives *" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
          <textarea value={introduction} onChange={e => setIntroduction(e.target.value)} placeholder="Introduction" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <textarea value={conclusion} onChange={e => setConclusion(e.target.value)} placeholder="Conclusion" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <textarea value={assessment} onChange={e => setAssessment(e.target.value)} placeholder="Assessment activity" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <input value={homework} onChange={e => setHomework(e.target.value)} placeholder="Homework" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
        </div>
        <button onClick={save} disabled={saving || !topicId || !objectives.trim()} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Create Lesson Plan'}</button>
      </div>

      <div className="rounded-2xl glass-panel overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Topic</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Objectives</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr> : lessons.map(l => (
              <tr key={l.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-slate-200">{l.topic_name || `Topic #${l.topic}`}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{l.date}</td>
                <td className="px-4 py-3 text-slate-300 text-xs max-w-xs truncate">{l.lesson_objectives}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${l.is_approved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{l.is_approved ? 'Approved' : 'Draft'}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setDeleteTarget(l)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">Delete</button>
                </td>
              </tr>
            ))}
            {!loading && lessons.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No lesson plans yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Lesson Plan" description={`Delete this lesson plan for "${deleteTarget?.topic_name}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

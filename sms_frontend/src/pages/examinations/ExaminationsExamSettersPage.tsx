import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PrintButton from '../../components/PrintButton'
import { Pencil, X } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface Session { id: number; name: string }
interface Subject { id: number; name: string }
interface SchoolClass { id: number; display_name: string; name: string }
interface UserItem { id: number; username: string; first_name: string; last_name: string }
interface ExamSetter {
  id: number
  session: number; session_name: string
  subject: number; subject_name: string
  school_class: number; class_name: string
  teacher: number; teacher_name: string
  deadline: string | null
  notes: string
  assigned_by_name: string
  created_at: string
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

const blank = { session: '', subject: '', school_class: '', teacher: '', deadline: '', notes: '' }

export default function ExaminationsExamSettersPage() {
  const [setters, setSetters] = useState<ExamSetter[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [filterSession, setFilterSession] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<ExamSetter | null>(null)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ExamSetter | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = filterSession ? `?session=${filterSession}` : ''
      const [rA, rS, rX, rC, rU] = await Promise.all([
        apiClient.get<ExamSetter[] | { results: ExamSetter[] }>(`/examinations/exam-setters/${params}`),
        apiClient.get<Session[] | { results: Session[] }>('/examinations/sessions/'),
        apiClient.get<Subject[] | { results: Subject[] }>('/academics/subjects/'),
        apiClient.get<SchoolClass[] | { results: SchoolClass[] }>('/academics/classes/'),
        apiClient.get<UserItem[] | { results: UserItem[] }>('/users/').catch(() => ({ data: [] as UserItem[] })),
      ])
      setSetters(asArray(rA.data))
      setSessions(asArray(rS.data))
      setSubjects(asArray(rX.data))
      setClasses(asArray(rC.data).map((c: any) => ({ ...c, display_name: c.display_name || c.name })))
      setUsers(asArray((rU as any).data))
    } catch { setError('Unable to load exam setter assignments.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [filterSession])

  const openCreate = () => {
    setEditing(null); setForm({ ...blank, session: filterSession }); setError(null); setModal(true)
  }

  const openEdit = (s: ExamSetter) => {
    setEditing(s)
    setForm({ session: String(s.session), subject: String(s.subject), school_class: String(s.school_class), teacher: String(s.teacher), deadline: s.deadline ?? '', notes: s.notes })
    setError(null); setModal(true)
  }

  const save = async () => {
    if (!form.session || !form.subject || !form.school_class || !form.teacher) {
      setError('Session, subject, class and teacher are required.'); return
    }
    setSaving(true); setError(null)
    try {
      const payload = {
        session: Number(form.session),
        subject: Number(form.subject),
        school_class: Number(form.school_class),
        teacher: Number(form.teacher),
        deadline: form.deadline || null,
        notes: form.notes,
      }
      if (editing) {
        await apiClient.put(`/examinations/exam-setters/${editing.id}/`, payload)
        setNotice('Exam setter assignment updated.')
      } else {
        await apiClient.post('/examinations/exam-setters/', payload)
        setNotice('Exam setter assigned successfully.')
      }
      setModal(false); await load()
    } catch (err: any) {
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.values(data).flat()
        setError(String(msgs[0] || 'Failed to save.'))
      } else { setError('Failed to save assignment.') }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await apiClient.delete(`/examinations/exam-setters/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setError('Failed to delete assignment.') }
    finally { setDeleting(false) }
  }

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const teacherLabel = (u: UserItem) =>
    [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username

  return (
    <div className="space-y-6">
      <PageHero
        badge="EXAMINATIONS"
        badgeColor="amber"
        title="Exam Setters"
        subtitle="Assign subject teachers to set exam papers"
        icon="📝"
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Exam Setter Assignments</h1>
          <p className="mt-1 text-sm text-slate-400">Assign teachers as exam setters per subject and class for each exam session.</p>
        </div>
        <div className="flex gap-2">
          <PrintButton printId="setters-print-area" label="Print List" title="Exam Setter Assignments" />
          <button onClick={openCreate} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 text-sm transition">
            + Assign Exam Setter
          </button>
        </div>
      </div>

      {error && !modal && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterSession} onChange={e => setFilterSession(e.target.value)}
          className="rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
          <option value="">All Sessions</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-xs text-slate-500 self-center">{setters.length} assignment{setters.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Print-only area */}
      <div id="setters-print-area" className="hidden">
        <div className="print-header">
          <h1>Exam Setter Assignments</h1>
          <p>{filterSession ? sessions.find(s => String(s.id) === filterSession)?.name : 'All Sessions'} — Generated {new Date().toLocaleDateString('en-KE')}</p>
        </div>
        <table>
          <thead><tr><th>Subject</th><th>Class</th><th>Session</th><th>Assigned Teacher</th><th>Deadline</th><th>Notes</th></tr></thead>
          <tbody>
            {setters.map(s => (
              <tr key={s.id}>
                <td>{s.subject_name}</td><td>{s.class_name}</td><td>{s.session_name}</td>
                <td>{s.teacher_name}</td><td>{s.deadline ?? '—'}</td><td>{s.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 animate-pulse">Loading...</div>
      ) : setters.length === 0 ? (
        <div className="py-20 text-center text-slate-500 rounded-2xl border border-dashed border-white/[0.07]">
          No exam setter assignments yet. Click "+ Assign Exam Setter" to begin.
        </div>
      ) : (
        <div className="rounded-2xl glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-left">Session</th>
                <th className="px-4 py-3 text-left">Assigned Teacher</th>
                <th className="px-4 py-3 text-left">Deadline</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {setters.map(s => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3 font-semibold text-slate-100">{s.subject_name}</td>
                  <td className="px-4 py-3 text-slate-300">{s.class_name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{s.session_name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold px-2.5 py-0.5">
                      {s.teacher_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{s.deadline ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(s)} className="p-1 text-slate-500 hover:text-slate-200 transition"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteTarget(s)} className="text-xs text-rose-400 hover:text-rose-300 transition">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.09] bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">{editing ? 'Edit Assignment' : 'Assign Exam Setter'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>}

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Exam Session *</label>
              <select value={form.session} onChange={e => setF('session', e.target.value)}
                className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-100">
                <option value="">Select session</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Subject *</label>
                <select value={form.subject} onChange={e => setF('subject', e.target.value)}
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-100">
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Class *</label>
                <select value={form.school_class} onChange={e => setF('school_class', e.target.value)}
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-100">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Assigned Teacher *</label>
              <select value={form.teacher} onChange={e => setF('teacher', e.target.value)}
                className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-100">
                <option value="">Select teacher</option>
                {users.map(u => <option key={u.id} value={u.id}>{teacherLabel(u)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Submission Deadline</label>
                <input type="date" value={form.deadline} onChange={e => setF('deadline', e.target.value)}
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-100" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                <input value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Optional"
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-100" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => void save()} disabled={saving}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 hover:bg-emerald-400 transition">
                {saving ? 'Saving...' : editing ? 'Update' : 'Assign'}
              </button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Remove Assignment"
        description={`Remove ${deleteTarget?.teacher_name} as exam setter for ${deleteTarget?.subject_name} — ${deleteTarget?.class_name}?`}
        confirmLabel="Remove" isProcessing={deleting} onConfirm={() => void handleDelete()} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

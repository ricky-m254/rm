import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Student = { id: number; full_name: string; admission_number: string }
type Award = { id: number; student: number; student_name?: string; award_name: string; category: string; awarded_by: string; award_date: string; description: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

const CATEGORIES = ['Academic', 'Sports', 'Arts', 'Leadership', 'Community', 'Other']

export default function SportsAwardsPage() {
  const [awards, setAwards] = useState<Award[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [studentId, setStudentId] = useState('')
  const [awardName, setAwardName] = useState('')
  const [category, setCategory] = useState('Sports')
  const [awardedBy, setAwardedBy] = useState('')
  const [awardDate, setAwardDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Award | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [aRes, sRes] = await Promise.all([
        apiClient.get<Award[] | { results: Award[] }>('/sports/awards/'),
        apiClient.get<Student[] | { results: Student[] }>('/students/?limit=200'),
      ])
      setAwards(asArray(aRes.data)); setStudents(asArray(sRes.data))
    } catch { setError('Unable to load awards.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!studentId || !awardName.trim() || !awardDate) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/sports/awards/', { student: Number(studentId), award_name: awardName.trim(), category, awarded_by: awardedBy, award_date: awardDate, description })
      setStudentId(''); setAwardName(''); setAwardedBy(''); setDescription('')
      setNotice('Award recorded.')
      await load()
    } catch { setError('Unable to save award.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/sports/awards/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete award.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="SPORTS"
        badgeColor="orange"
        title="Awards & Honours"
        subtitle="Trophies, certificates and sports recognition"
        icon="🏆"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="rounded-2xl glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Record New Award</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select value={studentId} onChange={e => setStudentId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option value="">Select student *</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.admission_number} - {s.full_name}</option>)}
          </select>
          <input value={awardName} onChange={e => setAwardName(e.target.value)} placeholder="Award name *" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input value={awardedBy} onChange={e => setAwardedBy(e.target.value)} placeholder="Awarded by" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <input type="date" value={awardDate} onChange={e => setAwardDate(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm lg:col-span-3" />
        </div>
        <button onClick={save} disabled={saving || !studentId || !awardName.trim()} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Record Award'}</button>
      </div>

      <div className="rounded-2xl glass-panel overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Award</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Awarded By</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr> : awards.map(a => (
              <tr key={a.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-slate-200">{a.student_name || `Student #${a.student}`}</td>
                <td className="px-4 py-3 font-semibold text-slate-100">{a.award_name}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">{a.category}</span></td>
                <td className="px-4 py-3 text-slate-300 text-xs">{a.award_date}</td>
                <td className="px-4 py-3 text-slate-300">{a.awarded_by || '-'}</td>
                <td className="px-4 py-3"><button onClick={() => setDeleteTarget(a)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">Delete</button></td>
              </tr>
            ))}
            {!loading && awards.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No awards recorded.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Award" description={`Delete award "${deleteTarget?.award_name}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Student = { id: number; full_name: string; admission_number: string }
type MealPlan = { id: number; name: string; is_active: boolean }
type Term = { id: number; name: string }
type Enrollment = { id: number; student: number; student_name: string; meal_plan: number; meal_plan_name: string; term: number | null; dietary_notes: string; is_active: boolean; created_at: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function CafeteriaEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [studentId, setStudentId] = useState('')
  const [planId, setPlanId] = useState('')
  const [termId, setTermId] = useState('')
  const [dietaryNotes, setDietaryNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [eRes, sRes, pRes, tRes] = await Promise.all([
        apiClient.get<Enrollment[] | { results: Enrollment[] }>('/cafeteria/enrollments/'),
        apiClient.get<Student[] | { results: Student[] }>('/students/?limit=500'),
        apiClient.get<MealPlan[] | { results: MealPlan[] }>('/cafeteria/meal-plans/'),
        apiClient.get<Term[] | { results: Term[] }>('/academics/ref/terms/'),
      ])
      setEnrollments(asArray(eRes.data)); setStudents(asArray(sRes.data))
      setPlans(asArray(pRes.data)); setTerms(asArray(tRes.data))
    } catch { setError('Unable to load enrollments.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!studentId || !planId) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/cafeteria/enrollments/', { student: Number(studentId), meal_plan: Number(planId), term: termId ? Number(termId) : null, dietary_notes: dietaryNotes, is_active: true })
      setStudentId(''); setPlanId(''); setTermId(''); setDietaryNotes('')
      setShowForm(false); setNotice('Student enrolled.'); await load()
    } catch { setError('Unable to enroll student.') }
    finally { setSaving(false) }
  }

  const toggleActive = async (en: Enrollment) => {
    try { await apiClient.patch(`/cafeteria/enrollments/${en.id}/`, { is_active: !en.is_active }); await load() }
    catch { setError('Unable to update enrollment.') }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/cafeteria/enrollments/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete enrollment.') }
    finally { setDeleting(false) }
  }

  const filtered = enrollments.filter(e => {
    const q = search.toLowerCase()
    return !q || e.student_name.toLowerCase().includes(q) || e.meal_plan_name.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <PageHero
        badge="CAFETERIA"
        badgeColor="teal"
        title="Meal Enrollments"
        subtitle="Student meal plan subscriptions and enrollments"
        icon="🍽️"
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Student Enrollments</h1>
          <p className="mt-1 text-sm text-slate-400">Manage student subscriptions to meal plans.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition">
          {showForm ? 'Cancel' : '+ Enroll Student'}
        </button>
      </div>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      {showForm ? (
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Enroll Student</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select value={studentId} onChange={e => setStudentId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2">
              <option value="">Select student *</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.admission_number} - {s.full_name}</option>)}
            </select>
            <select value={planId} onChange={e => setPlanId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
              <option value="">Meal plan *</option>
              {plans.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={termId} onChange={e => setTermId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
              <option value="">Term (optional)</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input value={dietaryNotes} onChange={e => setDietaryNotes(e.target.value)} placeholder="Dietary notes" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2 lg:col-span-4" />
          </div>
          <button onClick={save} disabled={saving || !studentId || !planId} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Enroll'}</button>
        </div>
      ) : null}

      <div className="rounded-2xl glass-panel">
        <div className="p-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student or plan…" className="w-full max-w-sm rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/[0.07] text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Meal Plan</th>
                <th className="px-4 py-3 font-medium">Term</th>
                <th className="px-4 py-3 font-medium">Dietary Notes</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr> : filtered.map(en => (
                <tr key={en.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-slate-200">{en.student_name}</td>
                  <td className="px-4 py-3 text-slate-300">{en.meal_plan_name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{en.term ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-[120px] truncate">{en.dietary_notes || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${en.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/40 text-slate-500'}`}>{en.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 text-xs">
                      <button onClick={() => toggleActive(en)} className="font-semibold text-sky-400 hover:text-sky-300">{en.is_active ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => setDeleteTarget(en)} className="font-semibold text-rose-400 hover:text-rose-300">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No enrollments found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Enrollment" description={`Remove ${deleteTarget?.student_name} from ${deleteTarget?.meal_plan_name}?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

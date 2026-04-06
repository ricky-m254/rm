import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Employee = { id: number; employee_id: string; full_name: string }
type PerformanceGoal = { id: number; employee: number; employee_name: string; title: string; status: string; target_date: string | null; weight: string }
type PerformanceReview = { id: number; employee: number; employee_name: string; reviewer: number | null; reviewer_name: string; review_period: string; overall_rating: string | null; status: string }

const defaultGoalForm = { employee: '', title: '', description: '', target_date: '', status: 'Not Started', weight: '0' }
const defaultReviewForm = { employee: '', reviewer: '', review_period: '', overall_rating: '', strengths: '', areas_improvement: '', status: 'Draft' }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

function statusBadgeClass(status: string) {
  if (status === 'Achieved' || status === 'Submitted' || status === 'Acknowledged') return 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
  if (status === 'In Progress') return 'border border-sky-500/30 bg-sky-500/15 text-sky-200'
  if (status === 'Not Achieved') return 'border border-rose-500/30 bg-rose-500/15 text-rose-200'
  return 'border border-slate-600 bg-slate-800/70 text-slate-200'
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csvRows = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
}

export default function HrPerformancePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [goals, setGoals] = useState<PerformanceGoal[]>([])
  const [reviews, setReviews] = useState<PerformanceReview[]>([])
  const [goalForm, setGoalForm] = useState(defaultGoalForm)
  const [reviewForm, setReviewForm] = useState(defaultReviewForm)
  const [search, setSearch] = useState('')
  const [goalStatusFilter, setGoalStatusFilter] = useState('All')
  const [reviewStatusFilter, setReviewStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [deleteGoalTarget, setDeleteGoalTarget] = useState<PerformanceGoal | null>(null)
  const [deletingGoal, setDeletingGoal] = useState(false)
  const [deleteGoalError, setDeleteGoalError] = useState<string | null>(null)

  const [deleteReviewTarget, setDeleteReviewTarget] = useState<PerformanceReview | null>(null)
  const [deletingReview, setDeletingReview] = useState(false)
  const [deleteReviewError, setDeleteReviewError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [empRes, goalRes, reviewRes] = await Promise.all([
        apiClient.get<Employee[] | { results: Employee[] }>('/hr/employees/'),
        apiClient.get<PerformanceGoal[] | { results: PerformanceGoal[] }>('/hr/performance-goals/'),
        apiClient.get<PerformanceReview[] | { results: PerformanceReview[] }>('/hr/performance-reviews/'),
      ])
      const employeeRows = asArray(empRes.data)
      setEmployees(employeeRows); setGoals(asArray(goalRes.data)); setReviews(asArray(reviewRes.data))
      if (employeeRows.length > 0) {
        setGoalForm((prev) => ({ ...prev, employee: prev.employee || String(employeeRows[0].id) }))
        setReviewForm((prev) => ({ ...prev, employee: prev.employee || String(employeeRows[0].id), reviewer: prev.reviewer || String(employeeRows[0].id) }))
      }
    } catch { setError('Unable to load performance data.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const filteredGoals = useMemo(() => {
    const query = search.trim().toLowerCase()
    return goals.filter((goal) => {
      const statusOk = goalStatusFilter === 'All' || goal.status === goalStatusFilter
      const searchOk = !query || `${goal.title} ${goal.employee_name}`.toLowerCase().includes(query)
      return statusOk && searchOk
    })
  }, [goals, search, goalStatusFilter])

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase()
    return reviews.filter((review) => {
      const statusOk = reviewStatusFilter === 'All' || review.status === reviewStatusFilter
      const searchOk = !query || `${review.employee_name} ${review.reviewer_name} ${review.review_period}`.toLowerCase().includes(query)
      return statusOk && searchOk
    })
  }, [reviews, search, reviewStatusFilter])

  const createGoal = async () => {
    if (!goalForm.employee || !goalForm.title.trim()) { setError('Employee and goal title are required.'); return }
    setWorking(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/hr/performance-goals/', { employee: Number(goalForm.employee), title: goalForm.title.trim(), description: goalForm.description, target_date: goalForm.target_date || null, status: goalForm.status, weight: Number(goalForm.weight || '0') })
      setGoalForm((prev) => ({ ...defaultGoalForm, employee: prev.employee })); setNotice('Performance goal created.'); await load()
    } catch { setError('Unable to create performance goal.') }
    finally { setWorking(false) }
  }

  const createReview = async () => {
    if (!reviewForm.employee || !reviewForm.review_period.trim()) { setError('Employee and review period are required.'); return }
    setWorking(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/hr/performance-reviews/', { employee: Number(reviewForm.employee), reviewer: reviewForm.reviewer ? Number(reviewForm.reviewer) : null, review_period: reviewForm.review_period.trim(), overall_rating: reviewForm.overall_rating ? Number(reviewForm.overall_rating) : null, strengths: reviewForm.strengths, areas_improvement: reviewForm.areas_improvement, status: reviewForm.status })
      setReviewForm((prev) => ({ ...defaultReviewForm, employee: prev.employee, reviewer: prev.reviewer })); setNotice('Performance review created.'); await load()
    } catch { setError('Unable to create performance review.') }
    finally { setWorking(false) }
  }

  const submitReview = async (id: number) => {
    setWorking(true); setError(null); setNotice(null)
    try { await apiClient.post(`/hr/performance-reviews/${id}/submit/`, {}); setNotice('Performance review submitted.'); await load() }
    catch { setError('Unable to submit review.') }
    finally { setWorking(false) }
  }

  const confirmDeleteGoal = async () => {
    if (!deleteGoalTarget) return
    setDeletingGoal(true); setDeleteGoalError(null)
    try { await apiClient.delete(`/hr/performance-goals/${deleteGoalTarget.id}/`); setDeleteGoalTarget(null); await load() }
    catch { setDeleteGoalError('Unable to delete goal.') }
    finally { setDeletingGoal(false) }
  }

  const confirmDeleteReview = async () => {
    if (!deleteReviewTarget) return
    setDeletingReview(true); setDeleteReviewError(null)
    try { await apiClient.delete(`/hr/performance-reviews/${deleteReviewTarget.id}/`); setDeleteReviewTarget(null); await load() }
    catch { setDeleteReviewError('Unable to delete review.') }
    finally { setDeletingReview(false) }
  }

  const exportGoals = () => downloadCsv('hr_performance_goals.csv', ['Title', 'Employee', 'Status', 'Target Date', 'Weight %'], filteredGoals.map((goal) => [goal.title, goal.employee_name, goal.status, goal.target_date || '', goal.weight]))
  const exportReviews = () => downloadCsv('hr_performance_reviews.csv', ['Employee', 'Reviewer', 'Review Period', 'Status', 'Rating'], filteredReviews.map((review) => [review.employee_name, review.reviewer_name || '', review.review_period, review.status, review.overall_rating || '']))

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="Performance Reviews"
        subtitle="Staff appraisals, targets and evaluations"
        icon="👥"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Performance Management</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Goals, Reviews, and Appraisal Tracking</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Goals</p><p className="mt-2 text-2xl font-semibold text-slate-100">{goals.length}</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Goals Achieved</p><p className="mt-2 text-2xl font-semibold text-slate-100">{goals.filter((g) => g.status === 'Achieved').length}</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Reviews</p><p className="mt-2 text-2xl font-semibold text-slate-100">{reviews.length}</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Submitted Reviews</p><p className="mt-2 text-2xl font-semibold text-slate-100">{reviews.filter((r) => r.status === 'Submitted').length}</p></article>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search goals/reviews..." className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
          <button onClick={() => { setSearch(''); setGoalStatusFilter('All'); setReviewStatusFilter('All') }} className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm text-slate-200">Reset Filters</button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Create Goal</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select value={goalForm.employee} onChange={(e) => setGoalForm((p) => ({ ...p, employee: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2">
              <option value="">Select employee</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_id} - {employee.full_name}</option>)}
            </select>
            <input value={goalForm.title} onChange={(e) => setGoalForm((p) => ({ ...p, title: e.target.value }))} placeholder="Goal title" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
            <input type="date" value={goalForm.target_date} onChange={(e) => setGoalForm((p) => ({ ...p, target_date: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <input type="number" min="0" step="0.01" value={goalForm.weight} onChange={(e) => setGoalForm((p) => ({ ...p, weight: e.target.value }))} placeholder="Weight %" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <select value={goalForm.status} onChange={(e) => setGoalForm((p) => ({ ...p, status: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2">
              <option>Not Started</option><option>In Progress</option><option>Achieved</option><option>Not Achieved</option>
            </select>
            <button onClick={createGoal} disabled={working} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60 sm:col-span-2">Save Goal</button>
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Create Review</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select value={reviewForm.employee} onChange={(e) => setReviewForm((p) => ({ ...p, employee: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
              <option value="">Reviewee</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
            </select>
            <select value={reviewForm.reviewer} onChange={(e) => setReviewForm((p) => ({ ...p, reviewer: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
              <option value="">Reviewer</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
            </select>
            <input value={reviewForm.review_period} onChange={(e) => setReviewForm((p) => ({ ...p, review_period: e.target.value }))} placeholder="Review period (e.g. Q3 2026)" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
            <input type="number" min="0" max="5" step="0.01" value={reviewForm.overall_rating} onChange={(e) => setReviewForm((p) => ({ ...p, overall_rating: e.target.value }))} placeholder="Overall rating" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <select value={reviewForm.status} onChange={(e) => setReviewForm((p) => ({ ...p, status: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
              <option>Draft</option><option>Submitted</option><option>Acknowledged</option>
            </select>
            <button onClick={createReview} disabled={working} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60 sm:col-span-2">Save Review</button>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Goals</h2>
            <div className="flex items-center gap-2">
              <select value={goalStatusFilter} onChange={(e) => setGoalStatusFilter(e.target.value)} className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1 text-xs">
                <option>All</option><option>Not Started</option><option>In Progress</option><option>Achieved</option><option>Not Achieved</option>
              </select>
              <button onClick={exportGoals} className="rounded-md border border-white/[0.09] px-2 py-1 text-[11px] text-slate-200">Export</button>
            </div>
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {filteredGoals.map((goal) => (
              <div key={goal.id} className="rounded-lg border border-white/[0.07] px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-100">{goal.title}</p>
                    <p className="mt-1">{goal.employee_name}</p>
                    <p>Target: {goal.target_date || '-'} | Weight: {goal.weight}%</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-1 text-[10px] ${statusBadgeClass(goal.status)}`}>{goal.status}</span>
                    <button onClick={() => setDeleteGoalTarget(goal)} className="text-[11px] font-semibold text-rose-400 hover:text-rose-300">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && filteredGoals.length === 0 ? <p className="text-slate-400">No goals match filters.</p> : null}
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Reviews</h2>
            <div className="flex items-center gap-2">
              <select value={reviewStatusFilter} onChange={(e) => setReviewStatusFilter(e.target.value)} className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1 text-xs">
                <option>All</option><option>Draft</option><option>Submitted</option><option>Acknowledged</option>
              </select>
              <button onClick={exportReviews} className="rounded-md border border-white/[0.09] px-2 py-1 text-[11px] text-slate-200">Export</button>
            </div>
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {filteredReviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-white/[0.07] px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-100">{review.employee_name} | {review.review_period}</p>
                    <p className="mt-1">Reviewer: {review.reviewer_name || '-'}</p>
                    <p>Rating: {review.overall_rating || '-'}</p>
                    <button onClick={() => void submitReview(review.id)} disabled={working} className="mt-2 rounded-md border border-white/[0.09] px-2 py-1 text-[11px] text-slate-200 disabled:opacity-60">Submit</button>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-1 text-[10px] ${statusBadgeClass(review.status)}`}>{review.status}</span>
                    <button onClick={() => setDeleteReviewTarget(review)} className="text-[11px] font-semibold text-rose-400 hover:text-rose-300">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && filteredReviews.length === 0 ? <p className="text-slate-400">No reviews match filters.</p> : null}
          </div>
        </article>
      </section>

      <ConfirmDialog open={!!deleteGoalTarget} title="Delete Goal" description={`Delete goal "${deleteGoalTarget?.title}"?`} confirmLabel="Delete" isProcessing={deletingGoal} error={deleteGoalError} onConfirm={confirmDeleteGoal} onCancel={() => setDeleteGoalTarget(null)} />
      <ConfirmDialog open={!!deleteReviewTarget} title="Delete Review" description={`Delete review for "${deleteReviewTarget?.employee_name}" (${deleteReviewTarget?.review_period})?`} confirmLabel="Delete" isProcessing={deletingReview} error={deleteReviewError} onConfirm={confirmDeleteReview} onCancel={() => setDeleteReviewTarget(null)} />
    </div>
  )
}

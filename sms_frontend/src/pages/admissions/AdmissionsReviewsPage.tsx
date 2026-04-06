import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import PageHero from '../../components/PageHero'

type Review = {
  id: number
  application: number
  application_number?: string
  overall_score?: number
  recommendation: string
  comments?: string
  reviewer_name?: string
  reviewed_at: string
}

type EditReview = {
  id: number
  overall_score: string
  recommendation: string
  comments: string
}

type Application = { id: number; application_number?: string; student_first_name: string; student_last_name: string }

const recommendationOptions = ['Accept', 'Reject', 'Waitlist', 'Further Review']
const MAX_SCORE = 9999.99

export default function AdmissionsReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [shortlistedIds, setShortlistedIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [editReview, setEditReview] = useState<EditReview | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [form, setForm] = useState({
    application: '',
    overall_score: '',
    recommendation: 'Further Review',
    comments: '',
  })

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [reviewsRes, applicationsRes, shortlistedRes] = await Promise.all([
        apiClient.get('/admissions/reviews/'),
        apiClient.get('/admissions/applications/'),
        apiClient.get('/admissions/shortlisted/'),
      ])
      setReviews(normalizePaginatedResponse<Review>(reviewsRes.data).items)
      setApplications(normalizePaginatedResponse<Application>(applicationsRes.data).items)
      const shortlistItems = normalizePaginatedResponse<Application>(shortlistedRes.data).items
      setShortlistedIds(new Set(shortlistItems.map((item) => item.id)))
    } catch {
      setError('Unable to load reviews data.')
      setFlash(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), 3000)
    return () => window.clearTimeout(timer)
  }, [flash])

  const createReview = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.application) {
      setError('Select an application first.')
      return
    }
    if (!recommendationOptions.includes(form.recommendation)) {
      setError('Invalid recommendation selected.')
      return
    }
    if (form.overall_score.trim()) {
      const parsed = Number(form.overall_score)
      if (Number.isNaN(parsed) || parsed < 0 || parsed > MAX_SCORE) {
        setError(`Overall score must be between 0 and ${MAX_SCORE}.`)
        return
      }
    }
    try {
      setError(null)
      await apiClient.post('/admissions/reviews/', {
        application: Number(form.application),
        overall_score: form.overall_score ? Number(form.overall_score) : undefined,
        recommendation: form.recommendation,
        comments: form.comments || undefined,
      })
      setForm({ application: '', overall_score: '', recommendation: 'Further Review', comments: '' })
      setFlash('Review saved.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.application?.[0]) setError(String(detail.application[0]))
      else if (detail?.error) setError(String(detail.error))
      else setError('Unable to create review.')
      setFlash(null)
    }
  }

  const openEdit = (row: Review) => {
    setEditReview({
      id: row.id,
      overall_score: row.overall_score != null ? String(row.overall_score) : '',
      recommendation: row.recommendation,
      comments: row.comments ?? '',
    })
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editReview) return
    if (editReview.overall_score.trim()) {
      const parsed = Number(editReview.overall_score)
      if (Number.isNaN(parsed) || parsed < 0 || parsed > MAX_SCORE) {
        setError(`Score must be between 0 and ${MAX_SCORE}.`)
        return
      }
    }
    setEditSaving(true)
    try {
      await apiClient.patch(`/admissions/reviews/${editReview.id}/`, {
        overall_score: editReview.overall_score ? Number(editReview.overall_score) : undefined,
        recommendation: editReview.recommendation,
        comments: editReview.comments || undefined,
      })
      setEditReview(null)
      setFlash('Review updated.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.error) setError(String(detail.error))
      else setError('Unable to update review.')
    } finally {
      setEditSaving(false)
    }
  }

  const shortlist = async (applicationId: number) => {
    try {
      setError(null)
      await apiClient.post(`/admissions/applications/${applicationId}/shortlist/`)
      setFlash('Application shortlisted.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.error) setError(String(detail.error))
      else setError('Unable to shortlist application.')
      setFlash(null)
    }
  }

  return (
    <>
    <div className="space-y-6">
      <PageHero
        badge="ADMISSIONS"
        badgeColor="amber"
        title="Application Reviews"
        subtitle="Review and shortlist admission applications"
        icon="📋"
      />

      <section className="rounded-2xl glass-panel p-6">
        {flash ? <p className="mb-4 text-sm text-emerald-300">{flash}</p> : null}
        <h2 className="text-lg font-display font-semibold">Create review</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={createReview}>
          <select
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm"
            value={form.application}
            onChange={(e) => setForm((p) => ({ ...p, application: e.target.value }))}
            required
          >
            <option value="">Select application</option>
            {applications.map((item) => (
              <option key={item.id} value={item.id}>
                {item.application_number ?? `APP-${item.id}`} - {item.student_first_name} {item.student_last_name}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm"
            placeholder="Overall score"
            value={form.overall_score}
            onChange={(e) => setForm((p) => ({ ...p, overall_score: e.target.value }))}
          />
          <select
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm"
            value={form.recommendation}
            onChange={(e) => setForm((p) => ({ ...p, recommendation: e.target.value }))}
          >
            {recommendationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-xl border border-white/[0.09] bg-slate-950/60 px-4 py-2 text-sm font-semibold hover:border-emerald-400">
            Save review
          </button>
          <input
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm md:col-span-4"
            placeholder="Comments"
            value={form.comments}
            onChange={(e) => setForm((p) => ({ ...p, comments: e.target.value }))}
          />
        </form>
      </section>

      <section className="rounded-2xl glass-panel p-6">
        {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
        {isLoading ? <p className="mb-4 text-sm text-slate-400">Loading reviews...</p> : null}
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Recommendation</th>
                <th className="px-4 py-3">Reviewer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {reviews.map((row) => (
                <tr key={row.id} className="bg-slate-950/60">
                  <td className="px-4 py-3">{row.application_number ?? `APP-${row.application}`}</td>
                  <td className="px-4 py-3">{row.overall_score ?? '--'}</td>
                  <td className="px-4 py-3">{row.recommendation}</td>
                  <td className="px-4 py-3">{row.reviewer_name ?? '--'}</td>
                  <td className="px-4 py-3">{row.reviewed_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        className="rounded-lg border border-emerald-400/40 px-2 py-1 text-xs text-emerald-300 hover:border-emerald-400 transition"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => shortlist(row.application)}
                        disabled={shortlistedIds.has(row.application)}
                      >
                        {shortlistedIds.has(row.application) ? 'Shortlisted' : 'Shortlist'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                    No reviews yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    {editReview && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
        <div className="w-full max-w-lg rounded-2xl p-6 space-y-5" style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-bold text-white">Edit Review</h2>
            <button onClick={() => setEditReview(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <form onSubmit={saveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Overall Score</label>
              <input type="number" step="0.01" value={editReview.overall_score}
                onChange={e => setEditReview(r => r ? { ...r, overall_score: e.target.value } : null)}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="Score (optional)" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Recommendation</label>
              <select value={editReview.recommendation}
                onChange={e => setEditReview(r => r ? { ...r, recommendation: e.target.value } : null)}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {recommendationOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Comments</label>
              <textarea rows={3} value={editReview.comments}
                onChange={e => setEditReview(r => r ? { ...r, comments: e.target.value } : null)}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="Additional comments..." />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditReview(null)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-300"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Cancel</button>
              <button type="submit" disabled={editSaving}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-slate-950 hover:opacity-90" style={{ background: '#10b981' }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}

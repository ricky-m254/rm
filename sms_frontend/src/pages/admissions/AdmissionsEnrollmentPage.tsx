import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import PageHero from '../../components/PageHero'

type ReadyApplication = {
  id: number
  application_number?: string
  student_first_name: string
  student_last_name: string
  guardian_name?: string
}
type SchoolClass = { id: number; display_name?: string; name: string; stream?: string }
type Term = { id: number; name: string }

export default function AdmissionsEnrollmentPage() {
  const [rows, setRows] = useState<ReadyApplication[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [checkingById, setCheckingById] = useState<Record<number, boolean>>({})
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [form, setForm] = useState({ school_class: '', term: '', admission_number: '', enrollment_date: new Date().toISOString().slice(0, 10) })

  const extractApiError = (detail: any, fallback: string) => {
    if (!detail) return fallback
    if (typeof detail === 'string') return detail
    if (detail.error) return String(detail.error)
    if (detail.detail) return String(detail.detail)
    if (typeof detail === 'object') {
      for (const value of Object.values(detail)) {
        if (Array.isArray(value) && value[0]) return String(value[0])
        if (typeof value === 'string' && value) return value
      }
    }
    return fallback
  }

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [readyRes, classRes, termRes] = await Promise.all([
        apiClient.get('/admissions/enrollment/ready/'),
        apiClient.get('/academics/ref/classes/'),
        apiClient.get('/academics/ref/terms/'),
      ])
      setRows(normalizePaginatedResponse<ReadyApplication>(readyRes.data).items)
      setClasses(normalizePaginatedResponse<SchoolClass>(classRes.data).items)
      setTerms(normalizePaginatedResponse<Term>(termRes.data).items)
    } catch {
      setError('Unable to load enrollment queue.')
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

  const checkEligibility = async (applicationId: number) => {
    try {
      setCheckingById((prev) => ({ ...prev, [applicationId]: true }))
      setError(null)
      setFlash(null)
      const response = await apiClient.post(`/admissions/applications/${applicationId}/enrollment-check/`)
      const checks = response.data?.checks ?? {}
      const failed = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key)
      if (failed.length > 0) {
        setError(`Eligibility failed: ${failed.join(', ')}`)
        setFlash(null)
      } else {
        setError(null)
        setFlash('Eligibility checks passed.')
      }
    } catch (err: any) {
      const detail = err?.response?.data
      setError(extractApiError(detail, 'Unable to run enrollment checks.'))
    } finally {
      setCheckingById((prev) => ({ ...prev, [applicationId]: false }))
    }
  }

  const enroll = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedId) {
      setError('Select an application first.')
      return
    }
    if (!form.school_class || !form.term) {
      setError('Class and term are required.')
      return
    }
    if (!form.enrollment_date) {
      setError('Enrollment date is required.')
      return
    }
    try {
      setIsEnrolling(true)
      setError(null)
      setFlash(null)
      await apiClient.post(`/admissions/applications/${selectedId}/enrollment-complete/`, {
        school_class: Number(form.school_class),
        term: Number(form.term),
        admission_number: form.admission_number || undefined,
        assign_admission_number: !form.admission_number,
        enrollment_date: form.enrollment_date,
      })
      setSelectedId(null)
      setForm({ school_class: '', term: '', admission_number: '', enrollment_date: new Date().toISOString().slice(0, 10) })
      setFlash('Enrollment completed.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      setError(extractApiError(detail, 'Unable to complete enrollment.'))
    } finally {
      setIsEnrolling(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ADMISSIONS"
        badgeColor="violet"
        title="Enrollment Processing"
        subtitle="Enrollment Processing management and overview."
        icon="📋"
      />

      <section className="rounded-2xl glass-panel p-6">
        {flash ? <p className="mb-4 text-sm text-emerald-300">{flash}</p> : null}
        {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
        {isLoading ? <p className="mb-4 text-sm text-slate-400">Loading enrollment queue...</p> : null}
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Guardian</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.id} className={selectedId === row.id ? 'bg-emerald-950/20' : 'bg-slate-950/60'}>
                  <td className="px-4 py-3">{row.application_number ?? `APP-${row.id}`}</td>
                  <td className="px-4 py-3">{row.student_first_name} {row.student_last_name}</td>
                  <td className="px-4 py-3">{row.guardian_name ?? '--'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isEnrolling}
                        className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => setSelectedId(row.id)}
                      >
                        Select
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(checkingById[row.id]) || isEnrolling}
                        className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => checkEligibility(row.id)}
                      >
                        {checkingById[row.id] ? 'Checking...' : 'Check'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={4}>
                    No ready applications.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-display font-semibold">Complete enrollment</h2>
        <p className="mt-1 text-sm text-slate-400">Selected application: {selectedId ?? '--'}</p>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={enroll}>
          <select className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm" value={form.school_class} onChange={(e) => setForm((p) => ({ ...p, school_class: e.target.value }))} required>
            <option value="">Select class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.display_name ?? `${item.name} ${item.stream ?? ''}`.trim()}</option>
            ))}
          </select>
          <select className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm" value={form.term} onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))} required>
            <option value="">Select term</option>
            {terms.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <input className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm" placeholder="Admission number (optional)" value={form.admission_number} onChange={(e) => setForm((p) => ({ ...p, admission_number: e.target.value }))} />
          <input type="date" className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm" value={form.enrollment_date} onChange={(e) => setForm((p) => ({ ...p, enrollment_date: e.target.value }))} required />
          <button
            type="submit"
            className="rounded-xl border border-white/[0.09] bg-slate-950/60 px-4 py-2 text-sm font-semibold hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-4"
            disabled={!selectedId || isEnrolling}
          >
            {isEnrolling ? 'Enrolling...' : 'Enroll selected'}
          </button>
        </form>
      </section>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import PageHero from '../../components/PageHero'

type Application = { id: number; application_number?: string; student_first_name: string; student_last_name: string }
type Interview = {
  id: number
  application: number
  application_number?: string
  interview_date: string
  interview_type: string
  location?: string
  status: string
  score?: number
  feedback?: string
}

const interviewTypeOptions = ['In-person', 'Phone', 'Video']
const interviewStatusOptions = ['Scheduled', 'Completed', 'Cancelled', 'No-show']
const MAX_SCORE = 9999.99

export default function AdmissionsInterviewsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [rows, setRows] = useState<Interview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [feedbackById, setFeedbackById] = useState<Record<number, string>>({})
  const [scoreById, setScoreById] = useState<Record<number, string>>({})
  const [dateById, setDateById] = useState<Record<number, string>>({})
  const [typeById, setTypeById] = useState<Record<number, string>>({})
  const [locationById, setLocationById] = useState<Record<number, string>>({})
  const [statusById, setStatusById] = useState<Record<number, string>>({})
  const [form, setForm] = useState({
    application: '',
    interview_date: '',
    interview_time: '',
    interview_type: 'In-person',
    location: '',
  })

  const toDatetimeLocalValue = (value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      const fallback = value.replace(' ', 'T')
      return fallback.length >= 16 ? fallback.slice(0, 16) : fallback
    }
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const toApiDateTime = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.length === 16) return `${trimmed}:00`
    return trimmed
  }

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const interviewParams = statusFilter !== 'all' ? { status: statusFilter } : undefined
      const [appRes, listRes] = await Promise.all([
        apiClient.get('/admissions/applications/'),
        apiClient.get('/admissions/interviews/', { params: interviewParams }),
      ])
      setApplications(normalizePaginatedResponse<Application>(appRes.data).items)
      const loaded = normalizePaginatedResponse<Interview>(listRes.data).items
      setRows(loaded)
      const feedbackSeed: Record<number, string> = {}
      const scoreSeed: Record<number, string> = {}
      const dateSeed: Record<number, string> = {}
      const typeSeed: Record<number, string> = {}
      const locationSeed: Record<number, string> = {}
      const statusSeed: Record<number, string> = {}
      loaded.forEach((row) => {
        feedbackSeed[row.id] = row.feedback ?? ''
        scoreSeed[row.id] = row.score != null ? String(row.score) : ''
        dateSeed[row.id] = toDatetimeLocalValue(row.interview_date)
        typeSeed[row.id] = row.interview_type
        locationSeed[row.id] = row.location ?? ''
        statusSeed[row.id] = row.status
      })
      setFeedbackById(feedbackSeed)
      setScoreById(scoreSeed)
      setDateById(dateSeed)
      setTypeById(typeSeed)
      setLocationById(locationSeed)
      setStatusById(statusSeed)
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.error) {
        setError(String(detail.error))
      } else {
        setError('Unable to load interviews data.')
      }
      setFlash(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), 3000)
    return () => window.clearTimeout(timer)
  }, [flash])

  const formatDateTime = (value?: string) => {
    if (!value) return '--'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value.replace('T', ' ').slice(0, 16)
    return d.toLocaleString()
  }

  const getScheduleDate = (value?: string) => {
    if (!value) return 'Unknown date'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value.slice(0, 10)
    return d.toLocaleDateString()
  }

  const sortedRows = [...rows].sort(
    (a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime(),
  )

  const calendarGroups = sortedRows.reduce<Record<string, Interview[]>>((acc, row) => {
    const key = getScheduleDate(row.interview_date)
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.application) {
      setError('Select an application first.')
      return
    }
    if (!form.interview_date || !form.interview_time) {
      setError('Interview date and time are required.')
      return
    }
    if (!interviewTypeOptions.includes(form.interview_type)) {
      setError('Invalid interview type selected.')
      return
    }
    try {
      const interviewDateTime = toApiDateTime(`${form.interview_date}T${form.interview_time}`)
      await apiClient.post('/admissions/interviews/', {
        application: Number(form.application),
        interview_date: interviewDateTime,
        interview_type: form.interview_type,
        location: form.location || undefined,
        status: 'Scheduled',
      })
      setForm({ application: '', interview_date: '', interview_time: '', interview_type: 'In-person', location: '' })
      setFlash('Interview scheduled.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.interview_date?.[0]) {
        setError(String(detail.interview_date[0]))
      } else if (detail?.error) {
        setError(String(detail.error))
      } else {
        setError('Unable to create interview.')
      }
      setFlash(null)
    }
  }

  const markCompleted = async (row: Interview) => {
    const scoreValue = scoreById[row.id]
    if (scoreValue !== '') {
      const parsed = Number(scoreValue)
      if (Number.isNaN(parsed) || parsed < 0 || parsed > MAX_SCORE) {
        setError(`Interview score must be between 0 and ${MAX_SCORE}.`)
        return
      }
    }
    try {
      await apiClient.post(`/admissions/interviews/${row.id}/feedback/`, {
        feedback: feedbackById[row.id] || 'Completed from dashboard.',
        score: scoreById[row.id] ? Number(scoreById[row.id]) : undefined,
        mark_completed: true,
      })
      setFlash('Interview marked completed.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.error) {
        setError(String(detail.error))
      } else {
        setError('Unable to update interview.')
      }
      setFlash(null)
    }
  }

  const saveFeedback = async (row: Interview) => {
    const scoreValue = scoreById[row.id]
    if (scoreValue !== '') {
      const parsed = Number(scoreValue)
      if (Number.isNaN(parsed) || parsed < 0 || parsed > MAX_SCORE) {
        setError(`Interview score must be between 0 and ${MAX_SCORE}.`)
        return
      }
    }
    try {
      await apiClient.post(`/admissions/interviews/${row.id}/feedback/`, {
        feedback: feedbackById[row.id] || undefined,
        score: scoreById[row.id] ? Number(scoreById[row.id]) : undefined,
      })
      setFlash('Interview feedback saved.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.error) {
        setError(String(detail.error))
      } else {
        setError('Unable to save interview feedback.')
      }
      setFlash(null)
    }
  }

  const saveSchedule = async (row: Interview) => {
    const scheduleValue = dateById[row.id]
    if (!scheduleValue) {
      setError('Interview date and time are required.')
      return
    }
    const nextType = typeById[row.id] || row.interview_type
    if (!interviewTypeOptions.includes(nextType)) {
      setError('Invalid interview type selected.')
      return
    }
    try {
      setError(null)
      await apiClient.patch(`/admissions/interviews/${row.id}/`, {
        interview_date: toApiDateTime(scheduleValue),
        interview_type: nextType,
        location: locationById[row.id] || undefined,
      })
      setFlash('Interview schedule updated.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.interview_date?.[0]) setError(String(detail.interview_date[0]))
      else if (detail?.error) setError(String(detail.error))
      else setError('Unable to update interview schedule.')
      setFlash(null)
    }
  }

  const saveStatus = async (row: Interview) => {
    const nextStatus = statusById[row.id] || row.status
    if (!interviewStatusOptions.includes(nextStatus)) {
      setError('Invalid interview status selected.')
      return
    }
    try {
      setError(null)
      await apiClient.patch(`/admissions/interviews/${row.id}/`, {
        status: nextStatus,
      })
      setFlash('Interview status updated.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.status?.[0]) setError(String(detail.status[0]))
      else if (detail?.error) setError(String(detail.error))
      else setError('Unable to update interview status.')
      setFlash(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ADMISSIONS"
        badgeColor="amber"
        title="Interviews"
        subtitle="Panel interview schedules and outcome records"
        icon="📋"
      />

      <section className="rounded-2xl glass-panel p-6">
        {flash ? <p className="mb-4 text-sm text-emerald-300">{flash}</p> : null}
        <h2 className="text-lg font-display font-semibold">Schedule interview</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={create}>
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
            type="date"
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm"
            value={form.interview_date}
            onChange={(e) => setForm((p) => ({ ...p, interview_date: e.target.value }))}
            required
          />
          <input
            type="time"
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm"
            value={form.interview_time}
            onChange={(e) => setForm((p) => ({ ...p, interview_time: e.target.value }))}
            required
          />
          <select
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm"
            value={form.interview_type}
            onChange={(e) => setForm((p) => ({ ...p, interview_type: e.target.value }))}
          >
            <option value="In-person">In-person</option>
            <option value="Phone">Phone</option>
            <option value="Video">Video</option>
          </select>
          <input
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm"
            placeholder="Location/Link"
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
          />
          <button type="submit" className="rounded-xl border border-white/[0.09] bg-slate-950/60 px-4 py-2 text-sm font-semibold hover:border-emerald-400 md:col-span-4">
            Create
          </button>
        </form>
      </section>

      <section className="rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-display font-semibold">Interview Calendar</h2>
          <select
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No-show">No-show</option>
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {Object.entries(calendarGroups).map(([dateLabel, items]) => (
            <div key={dateLabel} className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{dateLabel}</p>
              <div className="mt-2 space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
                    <span className="rounded-md border border-white/[0.09] px-2 py-1 text-xs">{formatDateTime(item.interview_date)}</span>
                    <span>{item.application_number ?? `APP-${item.application}`}</span>
                    <span className="text-slate-400">({item.interview_type})</span>
                    <span className="text-slate-400">- {item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">No interviews scheduled.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6">
        {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
        {isLoading ? <p className="mb-4 text-sm text-slate-400">Loading interviews...</p> : null}
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Feedback</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.id} className="bg-slate-950/60">
                  <td className="px-4 py-3">{row.application_number ?? `APP-${row.application}`}</td>
                  <td className="px-4 py-3">
                    <input
                      type="datetime-local"
                      className="w-[180px] rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={dateById[row.id] ?? ''}
                      onChange={(e) => setDateById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={typeById[row.id] ?? row.interview_type}
                      onChange={(e) => setTypeById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    >
                      <option value="In-person">In-person</option>
                      <option value="Phone">Phone</option>
                      <option value="Video">Video</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="w-full min-w-[160px] rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={locationById[row.id] ?? ''}
                      onChange={(e) => setLocationById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={statusById[row.id] ?? row.status}
                      onChange={(e) => setStatusById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="No-show">No-show</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="w-full rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={feedbackById[row.id] ?? ''}
                      onChange={(e) => setFeedbackById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      placeholder="Feedback"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={scoreById[row.id] ?? ''}
                      onChange={(e) => setScoreById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      placeholder="Score"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs"
                        onClick={() => saveSchedule(row)}
                      >
                        Save schedule
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs"
                        onClick={() => saveStatus(row)}
                      >
                        Save status
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs"
                        onClick={() => saveFeedback(row)}
                      >
                        Save feedback
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs"
                        onClick={() => markCompleted(row)}
                        disabled={row.status === 'Completed'}
                      >
                        {row.status === 'Completed' ? 'Completed' : 'Mark completed'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={8}>
                    No interviews found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

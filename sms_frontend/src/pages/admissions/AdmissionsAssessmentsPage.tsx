import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import PageHero from '../../components/PageHero'

type Application = { id: number; application_number?: string; student_first_name: string; student_last_name: string }
type Assessment = {
  id: number
  application: number
  application_number?: string
  scheduled_at: string
  venue?: string
  score?: number
  is_pass?: boolean | null
  status: string
  notes?: string
}

const assessmentStatusOptions = ['Scheduled', 'Completed', 'Missed']
const passOptions = ['unknown', 'pass', 'fail']
const MAX_SCORE = 9999.99

export default function AdmissionsAssessmentsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [rows, setRows] = useState<Assessment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [statusById, setStatusById] = useState<Record<number, string>>({})
  const [scoreById, setScoreById] = useState<Record<number, string>>({})
  const [passById, setPassById] = useState<Record<number, string>>({})
  const [notesById, setNotesById] = useState<Record<number, string>>({})
  const [form, setForm] = useState({
    application: '',
    scheduled_at: '',
    venue: '',
    status: 'Scheduled',
  })

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
      const [appRes, listRes] = await Promise.all([
        apiClient.get('/admissions/applications/'),
        apiClient.get('/admissions/assessments/'),
      ])
      setApplications(normalizePaginatedResponse<Application>(appRes.data).items)
      const loaded = normalizePaginatedResponse<Assessment>(listRes.data).items
      setRows(loaded)
      const statusSeed: Record<number, string> = {}
      const scoreSeed: Record<number, string> = {}
      const passSeed: Record<number, string> = {}
      const notesSeed: Record<number, string> = {}
      loaded.forEach((row) => {
        statusSeed[row.id] = row.status
        scoreSeed[row.id] = row.score != null ? String(row.score) : ''
        passSeed[row.id] = row.is_pass == null ? 'unknown' : row.is_pass ? 'pass' : 'fail'
        notesSeed[row.id] = row.notes ?? ''
      })
      setStatusById(statusSeed)
      setScoreById(scoreSeed)
      setPassById(passSeed)
      setNotesById(notesSeed)
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.error) setError(String(detail.error))
      else setError('Unable to load assessments data.')
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

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.application) {
      setError('Select an application first.')
      return
    }
    if (!form.scheduled_at) {
      setError('Assessment date and time are required.')
      return
    }
    if (!assessmentStatusOptions.includes(form.status)) {
      setError('Invalid assessment status selected.')
      return
    }
    try {
      setError(null)
      await apiClient.post('/admissions/assessments/', {
        application: Number(form.application),
        scheduled_at: toApiDateTime(form.scheduled_at),
        venue: form.venue || undefined,
        status: form.status,
      })
      setForm({ application: '', scheduled_at: '', venue: '', status: 'Scheduled' })
      setFlash('Assessment scheduled.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.application?.[0]) setError(String(detail.application[0]))
      else if (detail?.scheduled_at?.[0]) setError(String(detail.scheduled_at[0]))
      else if (detail?.error) setError(String(detail.error))
      else setError('Unable to create assessment.')
      setFlash(null)
    }
  }

  const saveRow = async (row: Assessment) => {
    const statusValue = statusById[row.id] || row.status
    if (!assessmentStatusOptions.includes(statusValue)) {
      setError('Invalid assessment status selected.')
      return
    }
    const passState = passById[row.id]
    if (!passOptions.includes(passState)) {
      setError('Invalid pass/fail state selected.')
      return
    }
    const scoreValue = scoreById[row.id]
    if (scoreValue !== '') {
      const parsedScore = Number(scoreValue)
      if (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > MAX_SCORE) {
        setError(`Assessment score must be between 0 and ${MAX_SCORE}.`)
        return
      }
    }
    try {
      setError(null)
      await apiClient.patch(`/admissions/assessments/${row.id}/`, {
        status: statusValue,
        score: scoreValue === '' ? null : Number(scoreValue),
        is_pass: passState === 'unknown' ? null : passState === 'pass',
        notes: notesById[row.id] || undefined,
      })
      setFlash('Assessment updated.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.status?.[0]) setError(String(detail.status[0]))
      else if (detail?.score?.[0]) setError(String(detail.score[0]))
      else if (detail?.error) setError(String(detail.error))
      else setError('Unable to update assessment.')
      setFlash(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ADMISSIONS"
        badgeColor="amber"
        title="Assessments"
        subtitle="Entrance tests and applicant evaluation results"
        icon="📋"
      />

      <section className="rounded-2xl glass-panel p-6">
        {flash ? <p className="mb-4 text-sm text-emerald-300">{flash}</p> : null}
        <h2 className="text-lg font-display font-semibold">Schedule assessment</h2>
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
            type="datetime-local"
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm"
            value={form.scheduled_at}
            onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
            required
          />
          <input
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm"
            placeholder="Venue"
            value={form.venue}
            onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
          />
          <button type="submit" className="rounded-xl border border-white/[0.09] bg-slate-950/60 px-4 py-2 text-sm font-semibold hover:border-emerald-400">
            Create
          </button>
        </form>
      </section>

      <section className="rounded-2xl glass-panel p-6">
        {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
        {isLoading ? <p className="mb-4 text-sm text-slate-400">Loading assessments...</p> : null}
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Pass</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.id} className="bg-slate-950/60">
                  <td className="px-4 py-3">{row.application_number ?? `APP-${row.application}`}</td>
                  <td className="px-4 py-3">{row.scheduled_at?.replace('T', ' ').slice(0, 16)}</td>
                  <td className="px-4 py-3">{row.venue ?? '--'}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={statusById[row.id] ?? row.status}
                      onChange={(e) => setStatusById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Missed">Missed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={scoreById[row.id] ?? ''}
                      onChange={(e) => setScoreById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={passById[row.id] ?? 'unknown'}
                      onChange={(e) => setPassById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    >
                      <option value="unknown">Unknown</option>
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="w-full min-w-[140px] rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={notesById[row.id] ?? ''}
                      onChange={(e) => setNotesById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs"
                      onClick={() => saveRow(row)}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={8}>
                    No assessments found.
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

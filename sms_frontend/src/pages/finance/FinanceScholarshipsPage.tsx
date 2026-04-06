import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import PageHero from '../../components/PageHero'

type Scholarship = {
  id: number
  student: number
  student_name?: string
  program_name: string
  award_type: 'FIXED' | 'PERCENT' | 'FULL'
  amount: number
  percentage?: number | null
  start_date?: string | null
  end_date?: string | null
  status: 'ACTIVE' | 'PAUSED' | 'ENDED'
  is_active: boolean
  created_at: string
}

type FinanceStudent = {
  id: number
  first_name: string
  last_name: string
  admission_number: string
}

const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.trim()) return detail
    const first = Object.values(data as Record<string, unknown>).find((value) =>
      Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0,
    )
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    if (typeof first === 'string') return first
  }
  return fallback
}

export default function FinanceScholarshipsPage() {
  const [rows, setRows] = useState<Scholarship[]>([])
  const [students, setStudents] = useState<FinanceStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [studentId, setStudentId] = useState('')
  const [programName, setProgramName] = useState('')
  const [awardType, setAwardType] = useState<'FIXED' | 'PERCENT' | 'FULL'>('FIXED')
  const [amount, setAmount] = useState('')
  const [percentage, setPercentage] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const hasInvalidDateRange = Boolean(startDate && endDate && endDate < startDate)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [scholarshipsRes, studentsRes] = await Promise.all([
        apiClient.get<Scholarship[] | { results: Scholarship[]; count: number }>('/finance/scholarships/', {
          params: {
            search: query.trim() || undefined,
            status: statusFilter || undefined,
          },
        }),
        apiClient.get<FinanceStudent[] | { results: FinanceStudent[]; count: number }>('/finance/ref/students/'),
      ])
      setRows(normalizePaginatedResponse(scholarshipsRes.data).items)
      setStudents(normalizePaginatedResponse(studentsRes.data).items)
    } catch (err) {
      setError(extractApiError(err, 'Unable to load scholarships.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter])

  const summary = useMemo(() => {
    const active = rows.filter((row) => row.status === 'ACTIVE').length
    const paused = rows.filter((row) => row.status === 'PAUSED').length
    const ended = rows.filter((row) => row.status === 'ENDED').length
    return { active, paused, ended, total: rows.length }
  }, [rows])

  const submit = async () => {
    if (isSubmitting || updatingId !== null) return
    if (!studentId || !programName.trim()) {
      setMessage('Student and program name are required.')
      return
    }
    if (hasInvalidDateRange) {
      setMessage('End date cannot be before start date.')
      return
    }
    if (awardType === 'FIXED' && !amount) {
      setMessage('Amount is required for fixed award.')
      return
    }
    if (awardType === 'PERCENT' && !percentage) {
      setMessage('Percentage is required for percentage award.')
      return
    }
    const amountValue = Number(amount)
    if (awardType === 'FIXED' && (!Number.isFinite(amountValue) || amountValue <= 0)) {
      setMessage('Fixed amount must be greater than zero.')
      return
    }
    if (awardType === 'PERCENT') {
      const percentageValue = Number(percentage)
      if (!Number.isFinite(percentageValue) || percentageValue <= 0 || percentageValue > 100) {
        setMessage('Percentage must be between 0 and 100.')
        return
      }
    }

    setMessage(null)
    setIsSubmitting(true)
    try {
      await apiClient.post('/finance/scholarships/', {
        student: Number(studentId),
        program_name: programName.trim(),
        award_type: awardType,
        amount: awardType === 'FULL' ? 0 : Number(amount || 0),
        percentage: awardType === 'PERCENT' ? Number(percentage) : null,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'ACTIVE',
      })
      setMessage('Scholarship created.')
      setStudentId('')
      setProgramName('')
      setAmount('')
      setPercentage('')
      setStartDate('')
      setEndDate('')
      await loadData()
    } catch (err) {
      setMessage(extractApiError(err, 'Failed to create scholarship.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateStatus = async (row: Scholarship, nextStatus: 'ACTIVE' | 'PAUSED' | 'ENDED') => {
    if (updatingId !== null || isSubmitting) return
    setMessage(null)
    setUpdatingId(row.id)
    try {
      await apiClient.patch(`/finance/scholarships/${row.id}/`, {
        status: nextStatus,
        is_active: nextStatus !== 'ENDED',
      })
      setMessage(`Scholarship ${nextStatus.toLowerCase()}.`)
      await loadData()
    } catch (err) {
      setMessage(extractApiError(err, 'Failed to update scholarship status.'))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title="Scholarships"
        subtitle="Manage scholarship and discount awards with live finance data."
        icon="💰"
      />

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200">
          {message}
        </div>
      ) : null}

      <section className="col-span-12 grid grid-cols-12 gap-4">
        <div className="col-span-6 md:col-span-3 rounded-2xl glass-panel p-4">
          <p className="text-xs text-slate-400">Total</p>
          <p className="mt-2 text-xl font-semibold">{summary.total}</p>
        </div>
        <div className="col-span-6 md:col-span-3 rounded-2xl glass-panel p-4">
          <p className="text-xs text-slate-400">Active</p>
          <p className="mt-2 text-xl font-semibold">{summary.active}</p>
        </div>
        <div className="col-span-6 md:col-span-3 rounded-2xl glass-panel p-4">
          <p className="text-xs text-slate-400">Paused</p>
          <p className="mt-2 text-xl font-semibold">{summary.paused}</p>
        </div>
        <div className="col-span-6 md:col-span-3 rounded-2xl glass-panel p-4">
          <p className="text-xs text-slate-400">Ended</p>
          <p className="mt-2 text-xl font-semibold">{summary.ended}</p>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-display font-semibold">Create scholarship</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={String(student.id)}>
                {student.first_name} {student.last_name} ({student.admission_number})
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            placeholder="Program name"
            value={programName}
            onChange={(event) => setProgramName(event.target.value)}
          />
          <select
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            value={awardType}
            onChange={(event) => setAwardType(event.target.value as 'FIXED' | 'PERCENT' | 'FULL')}
          >
            <option value="FIXED">Fixed amount</option>
            <option value="PERCENT">Percentage</option>
            <option value="FULL">Full coverage</option>
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            placeholder={awardType === 'PERCENT' ? '0.00' : 'Amount'}
            value={awardType === 'PERCENT' ? percentage : amount}
            onChange={(event) => {
              if (awardType === 'PERCENT') setPercentage(event.target.value)
              else setAmount(event.target.value)
            }}
          />
          <input
            type="date"
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <input
            type="date"
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
        <button
          className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
          onClick={() => void submit()}
          disabled={isSubmitting || updatingId !== null}
        >
          {isSubmitting ? 'Saving...' : 'Add scholarship'}
        </button>
        {hasInvalidDateRange ? (
          <p className="mt-2 text-xs text-amber-300">End date cannot be before start date.</p>
        ) : null}
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-display font-semibold">Scholarship roster</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search student/program"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="ENDED">ENDED</option>
            </select>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-200"
              onClick={() => {
                setQuery('')
                setStatusFilter('')
              }}
            >
              Reset
            </button>
          </div>
        </div>
        {isLoading ? (
          <p className="mt-4 text-sm text-slate-300">Loading scholarships...</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
            <table className="min-w-[1040px] w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row) => (
                  <tr key={row.id} className="bg-slate-950/60">
                    <td className="px-4 py-3">{row.student_name || row.student}</td>
                    <td className="px-4 py-3">{row.program_name}</td>
                    <td className="px-4 py-3">{row.award_type}</td>
                    <td className="px-4 py-3">
                      {row.award_type === 'PERCENT'
                        ? `${Number(row.percentage || 0).toLocaleString()}%`
                        : Number(row.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{row.start_date || '--'}</td>
                    <td className="px-4 py-3">{row.end_date || '--'}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {row.status !== 'ACTIVE' ? (
                          <button
                            className="rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-200 disabled:opacity-70"
                            onClick={() => void updateStatus(row, 'ACTIVE')}
                            disabled={updatingId !== null || isSubmitting}
                          >
                            {updatingId === row.id ? 'Working...' : 'Activate'}
                          </button>
                        ) : null}
                        {row.status === 'ACTIVE' ? (
                          <button
                            className="rounded border border-amber-600 px-2 py-1 text-xs text-amber-200 disabled:opacity-70"
                            onClick={() => void updateStatus(row, 'PAUSED')}
                            disabled={updatingId !== null || isSubmitting}
                          >
                            {updatingId === row.id ? 'Working...' : 'Pause'}
                          </button>
                        ) : null}
                        {row.status !== 'ENDED' ? (
                          <button
                            className="rounded border border-rose-600 px-2 py-1 text-xs text-rose-200 disabled:opacity-70"
                            onClick={() => void updateStatus(row, 'ENDED')}
                            disabled={updatingId !== null || isSubmitting}
                          >
                            {updatingId === row.id ? 'Working...' : 'End'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={8}>
                      No scholarships found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

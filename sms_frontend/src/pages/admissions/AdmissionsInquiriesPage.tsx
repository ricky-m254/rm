import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import PageHero from '../../components/PageHero'

type Inquiry = {
  id: number
  parent_name: string
  parent_phone?: string
  parent_email?: string
  child_name: string
  inquiry_date: string
  inquiry_source: string
  status: string
}

const statusOptions = ['New', 'Contacted', 'Interested', 'Applied', 'Lost']
const inquirySourceOptions = ['Website', 'Referral', 'Advertisement', 'Walk-in', 'Event', 'Other']

export default function AdmissionsInquiriesPage() {
  const [rows, setRows] = useState<Inquiry[]>([])
  const [statusById, setStatusById] = useState<Record<number, string>>({})
  const [genderById, setGenderById] = useState<Record<number, string>>({})
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [form, setForm] = useState({
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    child_name: '',
    inquiry_date: new Date().toISOString().slice(0, 10),
    inquiry_source: 'Website',
  })

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get('/admissions/inquiries/', {
        params: {
          search: query.trim() || undefined,
          status: status !== 'all' ? status : undefined,
        },
      })
      const normalized = normalizePaginatedResponse<Inquiry>(response.data)
      setRows(normalized.items)
      const statusSeed: Record<number, string> = {}
      const genderSeed: Record<number, string> = {}
      normalized.items.forEach((item) => {
        statusSeed[item.id] = item.status
        genderSeed[item.id] = 'Other'
      })
      setStatusById(statusSeed)
      setGenderById(genderSeed)
    } catch {
      setRows([])
      setError('Unable to load inquiries.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), 3000)
    return () => window.clearTimeout(timer)
  }, [flash])

  const displayRows = useMemo(() => rows, [rows])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!inquirySourceOptions.includes(form.inquiry_source)) {
      setError('Invalid inquiry source selected.')
      return
    }
    if (form.parent_email.trim()) {
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parent_email.trim())
      if (!isValidEmail) {
        setError('Parent email format is invalid.')
        return
      }
    }
    try {
      setError(null)
      await apiClient.post('/admissions/inquiries/', form)
      setForm({
        parent_name: '',
        parent_phone: '',
        parent_email: '',
        child_name: '',
        inquiry_date: new Date().toISOString().slice(0, 10),
        inquiry_source: 'Website',
      })
      setFlash('Inquiry created.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.child_name?.[0]) setError(String(detail.child_name[0]))
      else if (detail?.parent_name?.[0]) setError(String(detail.parent_name[0]))
      else if (detail?.error) setError(String(detail.error))
      else setError('Unable to create inquiry.')
      setFlash(null)
    }
  }

  const markLost = async (id: number) => {
    try {
      setError(null)
      await apiClient.post(`/admissions/inquiries/${id}/mark-lost/`)
      setFlash('Inquiry marked lost.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.error) setError(String(detail.error))
      else setError('Unable to mark inquiry as lost.')
      setFlash(null)
    }
  }

  const convertToApplication = async (id: number) => {
    try {
      setError(null)
      await apiClient.post(`/admissions/inquiries/${id}/convert/`, { student_gender: genderById[id] || 'Other' })
      setFlash('Inquiry converted to application.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.error) setError(String(detail.error))
      else setError('Unable to convert inquiry.')
      setFlash(null)
    }
  }

  const updateStatus = async (id: number) => {
    const nextStatus = statusById[id]
    if (!statusOptions.includes(nextStatus)) {
      setError('Invalid inquiry status selected.')
      return
    }
    try {
      setError(null)
      await apiClient.patch(`/admissions/inquiries/${id}/`, {
        status: nextStatus,
      })
      setFlash('Inquiry status updated.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.status?.[0]) setError(String(detail.status[0]))
      else if (detail?.error) setError(String(detail.error))
      else setError('Unable to update inquiry status.')
      setFlash(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ADMISSIONS"
        badgeColor="violet"
        title="Inquiries"
        subtitle="Inquiries management and overview."
        icon="📋"
      />

      <section className="rounded-2xl glass-panel p-6">
        {flash ? <p className="mb-4 text-sm text-emerald-300">{flash}</p> : null}
        <h2 className="text-lg font-display font-semibold">New inquiry</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={submit}>
          <input className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm" placeholder="Parent name" value={form.parent_name} onChange={(e) => setForm((p) => ({ ...p, parent_name: e.target.value }))} required />
          <input className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm" placeholder="Parent phone" value={form.parent_phone} onChange={(e) => setForm((p) => ({ ...p, parent_phone: e.target.value }))} />
          <input className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm" placeholder="Parent email" value={form.parent_email} onChange={(e) => setForm((p) => ({ ...p, parent_email: e.target.value }))} />
          <input className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm" placeholder="Child name" value={form.child_name} onChange={(e) => setForm((p) => ({ ...p, child_name: e.target.value }))} required />
          <input type="date" className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm" value={form.inquiry_date} onChange={(e) => setForm((p) => ({ ...p, inquiry_date: e.target.value }))} required />
          <select className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm" value={form.inquiry_source} onChange={(e) => setForm((p) => ({ ...p, inquiry_source: e.target.value }))}>
            {inquirySourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-xl border border-white/[0.09] bg-slate-950/60 px-4 py-2 text-sm font-semibold hover:border-emerald-400 md:col-span-3">
            Create inquiry
          </button>
        </form>
      </section>

      <section className="rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap gap-2">
          <input
            className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm"
            placeholder="Search parent/child"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm" onClick={load}>
            Search
          </button>
          <select className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? <p className="mt-4 text-sm text-slate-400">Loading inquiries...</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Child</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Convert Gender</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayRows.map((row) => (
                (() => {
                  const currentStatus = statusById[row.id] ?? row.status
                  return (
                <tr key={row.id} className="bg-slate-950/60">
                  <td className="px-4 py-3">{row.child_name}</td>
                  <td className="px-4 py-3">{row.parent_name}</td>
                  <td className="px-4 py-3">{row.inquiry_source}</td>
                  <td className="px-4 py-3">{row.inquiry_date}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={statusById[row.id] ?? row.status}
                      onChange={(e) => setStatusById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    >
                      {statusOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs"
                      value={genderById[row.id] ?? 'Other'}
                      onChange={(e) => setGenderById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs"
                        onClick={() => updateStatus(row.id)}
                      >
                        Save status
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => convertToApplication(row.id)}
                        disabled={currentStatus === 'Applied' || currentStatus === 'Lost'}
                      >
                        Convert
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => markLost(row.id)}
                        disabled={currentStatus === 'Lost'}
                      >
                        Mark lost
                      </button>
                    </div>
                  </td>
                </tr>
                  )
                })()
              ))}
              {!isLoading && displayRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={7}>
                    No inquiries found.
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

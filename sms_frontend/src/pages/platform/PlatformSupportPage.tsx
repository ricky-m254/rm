import { useEffect, useMemo, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type SupportTicket = {
  id: number
  ticket_number: string
  tenant: number
  tenant_name?: string
  category: string
  priority: string
  status: string
  subject: string
  description: string
  assigned_to: number | null
  assigned_to_username?: string
  created_at: string
}

type Tenant = { id: number; name: string }
type SlaOverview = {
  open_tickets: number
  overdue_first_response: number
  overdue_resolution: number
  avg_resolution_hours: string
}

export default function PlatformSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [slaOverview, setSlaOverview] = useState<SlaOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [noteBody, setNoteBody] = useState('')
  const [assignUserId, setAssignUserId] = useState('')

  const [form, setForm] = useState({
    tenant: '',
    category: 'TECHNICAL',
    priority: 'NORMAL',
    subject: '',
    description: '',
    created_by_email: '',
  })

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    const [ticketResult, tenantResult, slaResult] = await Promise.allSettled([
      publicApiClient.get<SupportTicket[] | { results: SupportTicket[]; count: number }>('/platform/support-tickets/'),
      publicApiClient.get<Tenant[] | { results: Tenant[]; count: number }>('/platform/tenants/'),
      publicApiClient.get<SlaOverview>('/platform/support-tickets/sla-overview/'),
    ])
    if (ticketResult.status === 'fulfilled') setTickets(normalizePaginatedResponse(ticketResult.value.data).items)
    if (tenantResult.status === 'fulfilled') setTenants(normalizePaginatedResponse(tenantResult.value.data).items)
    if (slaResult.status === 'fulfilled') setSlaOverview(slaResult.value.data)
    const firstError = [ticketResult, tenantResult, slaResult].find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (firstError) setError(extractApiErrorMessage(firstError.reason, 'Unable to load support tickets.'))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const filtered = useMemo(() => {
    return tickets.filter((item) => {
      const matchStatus = !statusFilter || item.status === statusFilter
      const matchTenant = !tenantFilter || String(item.tenant) === tenantFilter
      return matchStatus && matchTenant
    })
  }, [statusFilter, tenantFilter, tickets])

  const selected = filtered.find((item) => item.id === selectedId) ?? null

  const createTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/support-tickets/', {
        tenant: Number(form.tenant),
        category: form.category,
        priority: form.priority,
        subject: form.subject.trim(),
        description: form.description.trim(),
        created_by_email: form.created_by_email.trim() || undefined,
      })
      setForm((prev) => ({ ...prev, subject: '', description: '', created_by_email: '' }))
      setMessage('Support ticket created.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create support ticket.'))
    }
  }

  const actionTicket = async (id: number, action: 'resolve' | 'close') => {
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/support-tickets/${id}/${action}/`, {})
      setMessage(`Ticket ${action}d.`)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, `Unable to ${action} ticket.`))
    }
  }

  const assignTicket = async () => {
    if (!selected || !assignUserId.trim()) return
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/support-tickets/${selected.id}/assign/`, { user_id: Number(assignUserId) })
      setAssignUserId('')
      setMessage('Ticket assigned.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to assign ticket.'))
    }
  }

  const addNote = async () => {
    if (!selected || !noteBody.trim()) return
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/support-tickets/${selected.id}/add-note/`, {
        body: noteBody.trim(),
        is_internal: true,
      })
      setNoteBody('')
      setMessage('Internal note added.')
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to add note.'))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Support Tickets"
        subtitle="Support Tickets management and overview."
        icon="📋"
      />
      {slaOverview ? (
        <section className="col-span-12 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl glass-panel p-4 text-sm">Open tickets: {slaOverview.open_tickets}</div>
          <div className="rounded-2xl glass-panel p-4 text-sm">Overdue first response: {slaOverview.overdue_first_response}</div>
          <div className="rounded-2xl glass-panel p-4 text-sm">Overdue resolution: {slaOverview.overdue_resolution}</div>
          <div className="rounded-2xl glass-panel p-4 text-sm">Avg resolution (hrs): {slaOverview.avg_resolution_hours}</div>
        </section>
      ) : null}
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}
      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Create Ticket</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={createTicket}>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.tenant} onChange={(e) => setForm((p) => ({ ...p, tenant: e.target.value }))} required>
            <option value="">Select tenant</option>
            {tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
            {['TECHNICAL', 'BILLING', 'FEATURE', 'BUG'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
            {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Creator email" value={form.created_by_email} onChange={(e) => setForm((p) => ({ ...p, created_by_email: e.target.value }))} />
          <input className="md:col-span-2 rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} required />
          <input className="md:col-span-2 rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
          <button type="submit" className="md:col-span-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">Create Ticket</button>
        </form>
      </section>
      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap gap-2">
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
            <option value="">All tenants</option>
            {tenants.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
          </select>
          <button className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm" onClick={() => void loadData()}>Refresh</button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2">Ticket</th><th className="px-3 py-2">Tenant</th><th className="px-3 py-2">Priority</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? <tr><td className="px-3 py-3 text-slate-400" colSpan={6}>Loading...</td></tr> : null}
              {filtered.map((row) => (
                <tr key={row.id} className={`bg-slate-950/50 ${selectedId === row.id ? 'ring-1 ring-emerald-500/50' : ''}`}>
                  <td className="px-3 py-2">{row.ticket_number}</td><td className="px-3 py-2">{row.tenant_name ?? row.tenant}</td><td className="px-3 py-2">{row.priority}</td><td className="px-3 py-2">{row.status}</td><td className="px-3 py-2">{row.subject}</td>
                  <td className="px-3 py-2"><button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => setSelectedId(row.id)}>Select</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selected ? (
        <section className="col-span-12 rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-semibold">Ticket Actions: {selected.ticket_number}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Assign user ID" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} />
            <button className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm" onClick={() => void assignTicket()}>Assign</button>
            <button className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm" onClick={() => void actionTicket(selected.id, 'resolve')}>Resolve</button>
            <button className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm" onClick={() => void actionTicket(selected.id, 'close')}>Close</button>
            <input className="md:col-span-3 rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Internal note" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
            <button className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm" onClick={() => void addNote()}>Add Note</button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

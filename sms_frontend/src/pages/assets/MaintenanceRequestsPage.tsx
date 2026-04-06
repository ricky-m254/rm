import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Pencil, Trash2, X, Wrench, ChevronDown } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface Category { id: number; name: string }
interface Request {
  id: number
  title: string
  category: number | null
  category_name?: string
  description: string
  priority: string
  status: string
  location: string
  due_date: string
  cost_estimate: string
  actual_cost: string
  notes: string
  reported_by_name?: string
  created_at: string
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const STATUSES = ['Pending', 'Approved', 'In Progress', 'On Hold', 'Completed', 'Rejected']

const emptyForm = () => ({
  title: '', category: '', description: '', priority: 'Medium',
  status: 'Pending', location: '', due_date: '', cost_estimate: '', notes: '',
})

const priorityColor = (p: string) => {
  if (p === 'Urgent') return 'bg-red-500/20 text-red-300'
  if (p === 'High') return 'bg-orange-500/20 text-orange-300'
  if (p === 'Medium') return 'bg-amber-500/20 text-amber-300'
  return 'bg-slate-700 text-slate-300'
}
const statusColor = (s: string) => {
  if (s === 'Completed') return 'bg-emerald-500/20 text-emerald-300'
  if (s === 'In Progress') return 'bg-blue-500/20 text-blue-300'
  if (s === 'Pending') return 'bg-amber-500/20 text-amber-300'
  if (s === 'Approved') return 'bg-sky-500/20 text-sky-300'
  if (s === 'Rejected') return 'bg-rose-500/20 text-rose-300'
  return 'bg-slate-700 text-slate-300'
}

export default function MaintenanceRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Request | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [rRes, cRes] = await Promise.all([
        apiClient.get('/maintenance/requests/'),
        apiClient.get('/maintenance/categories/'),
      ])
      setRequests(asArray(rRes.data))
      setCategories(asArray(cRes.data))
    } catch { setError('Unable to load maintenance requests.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setError(null); setModal(true) }
  const openEdit = (r: Request) => {
    setEditing(r)
    setForm({
      title: r.title, category: r.category ? String(r.category) : '',
      description: r.description, priority: r.priority, status: r.status,
      location: r.location, due_date: r.due_date || '', cost_estimate: r.cost_estimate || '', notes: r.notes,
    })
    setError(null); setModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category ? Number(form.category) : null,
        description: form.description,
        priority: form.priority,
        status: form.status,
        location: form.location,
        due_date: form.due_date || null,
        cost_estimate: form.cost_estimate || '0',
        notes: form.notes,
      }
      if (editing) {
        await apiClient.put(`/maintenance/requests/${editing.id}/`, payload)
        setNotice('Request updated.')
      } else {
        await apiClient.post('/maintenance/requests/', payload)
        setNotice('Request created.')
      }
      setModal(false); await load()
    } catch { setError('Unable to save request.') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this maintenance request?')) return
    try { await apiClient.delete(`/maintenance/requests/${id}/`); setNotice('Request deleted.'); await load() }
    catch { setError('Unable to delete request.') }
  }

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const filtered = filterStatus ? requests.filter(r => r.status === filterStatus) : requests

  return (
    <div className="space-y-6">
      <PageHero
        badge="ASSETS"
        badgeColor="blue"
        title="Maintenance Requests"
        subtitle="Log and track facility and equipment repairs"
        icon="🏗️"
      />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Maintenance</p>
          <h1 className="mt-1 text-2xl font-display font-bold text-white">Requests</h1>
        </div>
        <button onClick={openCreate} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
          + New Request
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <div className="flex gap-3 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-300">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-400 px-2">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 px-2">No maintenance requests found.</p>
        ) : filtered.map(r => (
          <div key={r.id} className="rounded-2xl glass-panel">
            <div className="flex items-start justify-between gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Wrench className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="font-semibold text-white truncate">{r.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${priorityColor(r.priority)}`}>{r.priority}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${statusColor(r.status)}`}>{r.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{r.category_name || 'Uncategorised'} {r.location ? `· ${r.location}` : ''}</p>
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{r.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition">
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedId === r.id ? 'rotate-180' : ''}`} />
                </button>
                <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(r.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {expandedId === r.id && (
              <div className="border-t border-white/[0.07] p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div><p className="text-slate-500 uppercase tracking-wider mb-0.5">Due Date</p><p className="text-slate-200">{r.due_date || '—'}</p></div>
                <div><p className="text-slate-500 uppercase tracking-wider mb-0.5">Cost Estimate</p><p className="text-slate-200">Ksh {Number(r.cost_estimate || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p></div>
                <div><p className="text-slate-500 uppercase tracking-wider mb-0.5">Actual Cost</p><p className="text-slate-200">Ksh {Number(r.actual_cost || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p></div>
                <div><p className="text-slate-500 uppercase tracking-wider mb-0.5">Reported By</p><p className="text-slate-200">{r.reported_by_name || '—'}</p></div>
                {r.notes ? <div className="col-span-2 sm:col-span-4"><p className="text-slate-500 uppercase tracking-wider mb-0.5">Notes</p><p className="text-slate-300">{r.notes}</p></div> : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.07] bg-slate-950 p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Request' : 'New Request'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Title *</label>
              <input value={form.title} onChange={e => setF('title', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" placeholder="e.g. Broken window in Lab 2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Category</label>
                <select value={form.category} onChange={e => setF('category', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Priority</label>
                <select value={form.priority} onChange={e => setF('priority', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setF('status', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Location</label>
                <input value={form.location} onChange={e => setF('location', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" placeholder="Room / Block" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setF('due_date', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Cost Estimate (Ksh)</label>
                <input type="number" value={form.cost_estimate} onChange={e => setF('cost_estimate', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={3} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 hover:bg-emerald-400 transition">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

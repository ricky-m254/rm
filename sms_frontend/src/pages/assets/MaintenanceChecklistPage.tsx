import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { CheckSquare, Square, Trash2, X, Plus } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface MaintenanceRequest { id: number; title: string; status: string }
interface ChecklistItem {
  id: number
  request: number
  request_title?: string
  task_description: string
  is_completed: boolean
  completed_at: string | null
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function MaintenanceChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [taskDesc, setTaskDesc] = useState('')
  const [requestId, setRequestId] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterRequest, setFilterRequest] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [iRes, rRes] = await Promise.all([
        apiClient.get('/maintenance/checklist/'),
        apiClient.get('/maintenance/requests/'),
      ])
      setItems(asArray(iRes.data))
      setRequests(asArray(rRes.data))
    } catch { setError('Unable to load checklist.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => { setTaskDesc(''); setRequestId(''); setError(null); setModal(true) }

  const addItem = async () => {
    if (!taskDesc.trim() || !requestId) { setError('Request and task are required.'); return }
    setSaving(true); setError(null)
    try {
      await apiClient.post('/maintenance/checklist/', { request: Number(requestId), task_description: taskDesc.trim() })
      setNotice('Task added.'); setModal(false); await load()
    } catch { setError('Unable to add task.') }
    finally { setSaving(false) }
  }

  const toggle = async (item: ChecklistItem) => {
    try {
      await apiClient.patch(`/maintenance/checklist/${item.id}/`, { is_completed: !item.is_completed })
      await load()
    } catch { setError('Unable to update task.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this checklist item?')) return
    try { await apiClient.delete(`/maintenance/checklist/${id}/`); setNotice('Task deleted.'); await load() }
    catch { setError('Unable to delete task.') }
  }

  const reqMap = Object.fromEntries(requests.map(r => [r.id, r.title]))
  const filtered = filterRequest ? items.filter(i => i.request === Number(filterRequest)) : items
  const done = filtered.filter(i => i.is_completed).length

  return (
    <div className="space-y-6">
      <PageHero
        badge="ASSETS & MAINTENANCE"
        badgeColor="orange"
        title="Maintenance Checklists"
        subtitle="Track recurring inspection and maintenance schedules."
        icon="✅"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Maintenance</p>
          <h1 className="mt-1 text-2xl font-display font-bold text-white">Checklist</h1>
          {!loading && filtered.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">{done}/{filtered.length} tasks completed</p>
          )}
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <div className="flex gap-3">
        <select value={filterRequest} onChange={e => setFilterRequest(e.target.value)} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-300 min-w-[220px]">
          <option value="">All Requests</option>
          {requests.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
      </div>

      <div className="rounded-2xl glass-panel overflow-hidden">
        {loading ? (
          <p className="px-5 py-8 text-sm text-slate-500 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500 text-center">No checklist items found.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {filtered.map(item => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.025] transition group">
                <button onClick={() => toggle(item)} className="shrink-0 text-slate-400 hover:text-emerald-400 transition">
                  {item.is_completed
                    ? <CheckSquare className="h-5 w-5 text-emerald-400" />
                    : <Square className="h-5 w-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.is_completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {item.task_description}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{reqMap[item.request] || `Request #${item.request}`}</p>
                </div>
                {item.is_completed && item.completed_at && (
                  <span className="text-[10px] text-slate-500 shrink-0">{new Date(item.completed_at).toLocaleDateString()}</span>
                )}
                <button onClick={() => del(item.id)} className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">Add Checklist Task</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Maintenance Request *</label>
              <select value={requestId} onChange={e => setRequestId(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                <option value="">Select request</option>
                {requests.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Task Description *</label>
              <input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" placeholder="e.g. Replace broken pane" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={addItem} disabled={saving} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 hover:bg-emerald-400 transition">
                {saving ? 'Adding...' : 'Add Task'}
              </button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

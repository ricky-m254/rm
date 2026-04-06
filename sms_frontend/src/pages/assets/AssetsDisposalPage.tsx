import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Trash2, Plus, X, AlertTriangle } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import ConfirmDialog from '../../components/ConfirmDialog'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Asset = { id: number; name: string; asset_code: string }
type Disposal = {
  id: number
  asset: number
  asset_name: string
  asset_code: string
  disposal_type: string
  disposal_date: string
  disposed_value: string
  disposal_reason: string
  approved_by: string
  status: string
  notes: string
}

const DISPOSAL_TYPES = ['sold', 'donated', 'scrapped', 'stolen', 'transferred_out']
const STATUSES = ['pending', 'approved', 'completed', 'cancelled']

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  approved: 'bg-blue-500/15 text-blue-300',
  completed: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-rose-500/15 text-rose-300',
}

const TYPE_LABEL: Record<string, string> = {
  sold: 'Sold',
  donated: 'Donated',
  scrapped: 'Scrapped / Written Off',
  stolen: 'Stolen / Lost',
  transferred_out: 'Transferred Out',
}

export default function AssetsDisposalPage() {
  const [records, setRecords] = useState<Disposal[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const blankForm = {
    asset: '',
    disposal_type: 'scrapped',
    disposal_date: new Date().toISOString().split('T')[0],
    disposed_value: '0',
    disposal_reason: '',
    approved_by: '',
    status: 'pending',
    notes: '',
  }
  const [form, setForm] = useState(blankForm)
  const [isProcessing, setIsProcessing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Disposal | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const [dr, ar] = await Promise.all([
        apiClient.get<Disposal[]>('/assets/disposals/'),
        apiClient.get<Asset[]>('/assets/'),
      ])
      setRecords(dr.data)
      setAssets(ar.data)
    } catch {
      setError('Failed to load disposal records.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditingId(null); setForm(blankForm); setShowForm(true) }
  const openEdit = (r: Disposal) => {
    setEditingId(r.id)
    setForm({
      asset: String(r.asset),
      disposal_type: r.disposal_type,
      disposal_date: r.disposal_date,
      disposed_value: r.disposed_value,
      disposal_reason: r.disposal_reason,
      approved_by: r.approved_by,
      status: r.status,
      notes: r.notes,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.asset) { setError('Please select an asset.'); return }
    setIsProcessing(true)
    try {
      const payload = { ...form, asset: Number(form.asset), disposed_value: Number(form.disposed_value) }
      if (editingId) {
        await apiClient.patch(`/assets/disposals/${editingId}/`, payload)
      } else {
        await apiClient.post('/assets/disposals/', payload)
      }
      setShowForm(false)
      setError(null)
      await load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown } }
      setError(JSON.stringify(e?.response?.data ?? 'Error saving disposal record.'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await apiClient.delete(`/assets/disposals/${deleteTarget.id}/`)
      setDeleteTarget(null)
      await load()
    } catch {
      setError('Failed to delete record.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Asset Disposal"
        subtitle="Manage asset retirement — sales, donations, write-offs, and losses."
        icon={<Trash2 size={22} className="text-rose-400" />}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{records.length} disposal record{records.length !== 1 ? 's' : ''}</p>
        <button onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/25 transition-colors">
          <Plus size={15} /> Record Disposal
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-6" style={GLASS}>
          <h3 className="text-base font-semibold text-white mb-4">{editingId ? 'Edit Disposal Record' : 'Record Asset Disposal'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Asset *</label>
              <select value={form.asset} onChange={e => setForm(f => ({ ...f, asset: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required>
                <option value="">Select asset…</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Disposal Type *</label>
              <select value={form.disposal_type} onChange={e => setForm(f => ({ ...f, disposal_type: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                {DISPOSAL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Disposal Date *</label>
              <input type="date" value={form.disposal_date} onChange={e => setForm(f => ({ ...f, disposal_date: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Disposal Value (KES)</label>
              <input type="number" value={form.disposed_value} onChange={e => setForm(f => ({ ...f, disposed_value: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200"
                min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Approved By</label>
              <input type="text" value={form.approved_by} onChange={e => setForm(f => ({ ...f, approved_by: e.target.value }))}
                placeholder="Authorizing officer name"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Disposal Reason</label>
              <textarea value={form.disposal_reason} onChange={e => setForm(f => ({ ...f, disposal_reason: e.target.value }))}
                rows={2} placeholder="Reason for disposal…"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Additional notes…"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={isProcessing}
                className="rounded-xl bg-rose-500/20 border border-rose-500/30 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/30 disabled:opacity-50">
                {isProcessing ? 'Saving…' : editingId ? 'Update Record' : 'Record Disposal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl p-8 text-center text-slate-500 text-sm" style={GLASS}>Loading…</div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={GLASS}>
          <Trash2 size={32} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400 text-sm">No disposal records yet.</p>
          <p className="text-slate-600 text-xs mt-1">Record retired, sold, or written-off assets here.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {['Asset', 'Type', 'Date', 'Value (KES)', 'Approved By', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{r.asset_name}</p>
                    <p className="text-xs text-slate-500">{r.asset_code}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{TYPE_LABEL[r.disposal_type] ?? r.disposal_type}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.disposal_date}</td>
                  <td className="px-4 py-3 text-slate-300">{Number(r.disposed_value).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-400">{r.approved_by || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? 'bg-slate-500/15 text-slate-400'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(r)}
                        className="rounded-lg px-3 py-1 text-xs border border-white/10 text-slate-300 hover:bg-white/5">Edit</button>
                      <button onClick={() => setDeleteTarget(r)}
                        className="rounded-lg px-3 py-1 text-xs border border-rose-500/30 text-rose-400 hover:bg-rose-500/10">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Disposal Record"
        message={`Delete the disposal record for "${deleteTarget?.asset_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

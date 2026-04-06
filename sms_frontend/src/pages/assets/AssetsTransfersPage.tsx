import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRightLeft, Plus, X, AlertTriangle } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import ConfirmDialog from '../../components/ConfirmDialog'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Asset = { id: number; name: string; asset_code: string; location: string }
type Transfer = {
  id: number
  asset: number
  asset_name: string
  asset_code: string
  from_location: string
  to_location: string
  transferred_by: string
  transfer_date: string
  received_date: string | null
  status: string
  notes: string
}

const STATUSES = ['pending', 'in_transit', 'completed', 'cancelled']
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  in_transit: 'bg-blue-500/15 text-blue-300',
  completed: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-rose-500/15 text-rose-300',
}

export default function AssetsTransfersPage() {
  const [records, setRecords] = useState<Transfer[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const blankForm = {
    asset: '',
    from_location: '',
    to_location: '',
    transferred_by: '',
    transfer_date: new Date().toISOString().split('T')[0],
    received_date: '',
    status: 'pending',
    notes: '',
  }
  const [form, setForm] = useState(blankForm)
  const [isProcessing, setIsProcessing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Transfer | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const [tr, ar] = await Promise.all([
        apiClient.get<Transfer[]>('/assets/transfers/'),
        apiClient.get<Asset[]>('/assets/'),
      ])
      setRecords(tr.data)
      setAssets(ar.data)
    } catch {
      setError('Failed to load transfer records.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditingId(null); setForm(blankForm); setShowForm(true) }
  const openEdit = (r: Transfer) => {
    setEditingId(r.id)
    setForm({
      asset: String(r.asset),
      from_location: r.from_location,
      to_location: r.to_location,
      transferred_by: r.transferred_by,
      transfer_date: r.transfer_date,
      received_date: r.received_date ?? '',
      status: r.status,
      notes: r.notes,
    })
    setShowForm(true)
  }

  const handleAssetChange = (assetId: string) => {
    const a = assets.find(a => String(a.id) === assetId)
    setForm(f => ({ ...f, asset: assetId, from_location: a?.location ?? '' }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.asset) { setError('Please select an asset.'); return }
    setIsProcessing(true)
    try {
      const payload = {
        ...form,
        asset: Number(form.asset),
        received_date: form.received_date || null,
      }
      if (editingId) {
        await apiClient.patch(`/assets/transfers/${editingId}/`, payload)
      } else {
        await apiClient.post('/assets/transfers/', payload)
      }
      setShowForm(false); setError(null); await load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown } }
      setError(JSON.stringify(e?.response?.data ?? 'Error saving.'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await apiClient.delete(`/assets/transfers/${deleteTarget.id}/`)
      setDeleteTarget(null); await load()
    } catch { setError('Failed to delete.') }
    finally { setIsDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Asset Transfers"
        subtitle="Track asset movements between locations, departments, and classrooms."
        icon={<ArrowRightLeft size={22} className="text-sky-400" />}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{records.length} transfer record{records.length !== 1 ? 's' : ''}</p>
        <button onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-sky-500/15 border border-sky-500/30 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/25 transition-colors">
          <Plus size={15} /> New Transfer
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-6" style={GLASS}>
          <h3 className="text-base font-semibold text-white mb-4">{editingId ? 'Edit Transfer' : 'Record Asset Transfer'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Asset *</label>
              <select value={form.asset} onChange={e => handleAssetChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required>
                <option value="">Select asset…</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Transfer Date *</label>
              <input type="date" value={form.transfer_date} onChange={e => setForm(f => ({ ...f, transfer_date: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">From Location *</label>
              <input type="text" value={form.from_location} onChange={e => setForm(f => ({ ...f, from_location: e.target.value }))}
                placeholder="Current location"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">To Location *</label>
              <input type="text" value={form.to_location} onChange={e => setForm(f => ({ ...f, to_location: e.target.value }))}
                placeholder="Destination"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Transferred By</label>
              <input type="text" value={form.transferred_by} onChange={e => setForm(f => ({ ...f, transferred_by: e.target.value }))}
                placeholder="Staff name"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Received Date</label>
              <input type="date" value={form.received_date} onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={isProcessing}
                className="rounded-xl bg-sky-500/20 border border-sky-500/30 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/30 disabled:opacity-50">
                {isProcessing ? 'Saving…' : editingId ? 'Update Transfer' : 'Record Transfer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl p-8 text-center text-slate-500 text-sm" style={GLASS}>Loading…</div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={GLASS}>
          <ArrowRightLeft size={32} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400 text-sm">No transfer records yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {['Asset', 'From → To', 'Date', 'Transferred By', 'Status', ''].map(h => (
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-xs text-slate-500">{r.from_location}</span>
                      <ArrowRightLeft size={12} className="text-sky-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-200">{r.to_location}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.transfer_date}</td>
                  <td className="px-4 py-3 text-slate-400">{r.transferred_by || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? 'bg-slate-500/15 text-slate-400'}`}>
                      {r.status.replace('_', ' ')}
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
        title="Delete Transfer Record"
        message={`Delete the transfer record for "${deleteTarget?.asset_name}"?`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

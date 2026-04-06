import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Shield, Plus, X, AlertTriangle, Clock } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import ConfirmDialog from '../../components/ConfirmDialog'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Asset = { id: number; name: string; asset_code: string }
type Warranty = {
  id: number
  asset: number
  asset_name: string
  asset_code: string
  provider: string
  warranty_number: string
  start_date: string
  expiry_date: string
  coverage_details: string
  contact_info: string
  alert_days_before: number
  status: string
  notes: string
  is_expiring_soon: boolean
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-300',
  expired: 'bg-rose-500/15 text-rose-300',
  void: 'bg-slate-500/15 text-slate-400',
}

export default function AssetsWarrantyPage() {
  const [records, setRecords] = useState<Warranty[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const blankForm = {
    asset: '',
    provider: '',
    warranty_number: '',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    coverage_details: '',
    contact_info: '',
    alert_days_before: '30',
    status: 'active',
    notes: '',
  }
  const [form, setForm] = useState(blankForm)
  const [isProcessing, setIsProcessing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Warranty | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const [wr, ar] = await Promise.all([
        apiClient.get<Warranty[]>('/assets/warranties/'),
        apiClient.get<Asset[]>('/assets/'),
      ])
      setRecords(wr.data)
      setAssets(ar.data)
    } catch {
      setError('Failed to load warranty records.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditingId(null); setForm(blankForm); setShowForm(true) }
  const openEdit = (r: Warranty) => {
    setEditingId(r.id)
    setForm({
      asset: String(r.asset),
      provider: r.provider,
      warranty_number: r.warranty_number,
      start_date: r.start_date,
      expiry_date: r.expiry_date,
      coverage_details: r.coverage_details,
      contact_info: r.contact_info,
      alert_days_before: String(r.alert_days_before),
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
      const payload = { ...form, asset: Number(form.asset), alert_days_before: Number(form.alert_days_before) }
      if (editingId) {
        await apiClient.patch(`/assets/warranties/${editingId}/`, payload)
      } else {
        await apiClient.post('/assets/warranties/', payload)
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
      await apiClient.delete(`/assets/warranties/${deleteTarget.id}/`)
      setDeleteTarget(null); await load()
    } catch { setError('Failed to delete.') }
    finally { setIsDeleting(false) }
  }

  const expiringSoon = records.filter(r => r.is_expiring_soon && r.status === 'active').length
  const filtered = filterStatus === 'all' ? records : records.filter(r => r.status === filterStatus)

  return (
    <div className="space-y-6">
      <PageHero
        title="Warranty Tracking"
        subtitle="Monitor asset warranties, service contracts, and expiry alerts."
        icon={<Shield size={22} className="text-violet-400" />}
      />

      {expiringSoon > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <Clock size={16} className="shrink-0" />
          <span><strong>{expiringSoon}</strong> warranty{expiringSoon !== 1 ? 'ies' : 'y'} expiring within alert window</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2">
          {['all', 'active', 'expired', 'void'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'border border-white/10 text-slate-400 hover:bg-white/5'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-violet-500/15 border border-violet-500/30 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/25 transition-colors">
          <Plus size={15} /> Add Warranty
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-6" style={GLASS}>
          <h3 className="text-base font-semibold text-white mb-4">{editingId ? 'Edit Warranty' : 'Add Warranty Record'}</h3>
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
              <label className="block text-xs text-slate-400 mb-1">Warranty Provider *</label>
              <input type="text" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                placeholder="e.g. Dell Kenya, HP Africa"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Warranty Number</label>
              <input type="text" value={form.warranty_number} onChange={e => setForm(f => ({ ...f, warranty_number: e.target.value }))}
                placeholder="Contract / reference number"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Contact Info</label>
              <input type="text" value={form.contact_info} onChange={e => setForm(f => ({ ...f, contact_info: e.target.value }))}
                placeholder="Phone, email, or website"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Expiry Date *</label>
              <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Alert Days Before Expiry</label>
              <input type="number" value={form.alert_days_before} onChange={e => setForm(f => ({ ...f, alert_days_before: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200"
                min="1" max="365" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="void">Void</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Coverage Details</label>
              <textarea value={form.coverage_details} onChange={e => setForm(f => ({ ...f, coverage_details: e.target.value }))}
                rows={2} placeholder="What is covered by this warranty?"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={isProcessing}
                className="rounded-xl bg-violet-500/20 border border-violet-500/30 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/30 disabled:opacity-50">
                {isProcessing ? 'Saving…' : editingId ? 'Update Warranty' : 'Add Warranty'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl p-8 text-center text-slate-500 text-sm" style={GLASS}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={GLASS}>
          <Shield size={32} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400 text-sm">No warranty records found.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {['Asset', 'Provider', 'Warranty #', 'Expiry', 'Alert', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{r.asset_name}</p>
                    <p className="text-xs text-slate-500">{r.asset_code}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{r.provider}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.warranty_number || '—'}</td>
                  <td className="px-4 py-3">
                    <p className={`text-sm whitespace-nowrap ${r.is_expiring_soon && r.status === 'active' ? 'text-amber-300 font-medium' : 'text-slate-400'}`}>
                      {r.expiry_date}
                    </p>
                    {r.is_expiring_soon && r.status === 'active' && (
                      <p className="text-[10px] text-amber-400 flex items-center gap-1"><Clock size={10} /> Expiring soon</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.alert_days_before}d</td>
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
        title="Delete Warranty Record"
        message={`Delete warranty for "${deleteTarget?.asset_name}"?`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

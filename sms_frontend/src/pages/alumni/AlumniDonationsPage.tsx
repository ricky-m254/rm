import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Heart, Plus, X, AlertTriangle, TrendingUp } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import ConfirmDialog from '../../components/ConfirmDialog'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type AlumniProfile = { id: number; first_name: string; last_name: string; graduation_year: number }
type Donation = {
  id: number
  alumni: number
  alumni_name: string
  alumni_graduation_year: number
  campaign_name: string
  amount: string
  currency: string
  payment_method: string
  donation_date: string
  reference: string
  status: string
  is_anonymous: boolean
  notes: string
}

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'online']
const STATUSES = ['pledged', 'received', 'acknowledged', 'cancelled']
const STATUS_COLOR: Record<string, string> = {
  pledged: 'bg-amber-500/15 text-amber-300',
  received: 'bg-blue-500/15 text-blue-300',
  acknowledged: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-rose-500/15 text-rose-300',
}
const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  cheque: 'Cheque',
  online: 'Online / Card',
}

export default function AlumniDonationsPage() {
  const [records, setRecords] = useState<Donation[]>([])
  const [alumniList, setAlumniList] = useState<AlumniProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const blankForm = {
    alumni: '',
    campaign_name: 'General Fund',
    amount: '',
    currency: 'KES',
    payment_method: 'mobile_money',
    donation_date: new Date().toISOString().split('T')[0],
    reference: '',
    status: 'received',
    is_anonymous: false,
    notes: '',
  }
  const [form, setForm] = useState(blankForm)
  const [isProcessing, setIsProcessing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Donation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const [dr, ar] = await Promise.all([
        apiClient.get<Donation[]>('/alumni/donations/'),
        apiClient.get<AlumniProfile[]>('/alumni/profiles/'),
      ])
      setRecords(dr.data)
      setAlumniList(ar.data)
    } catch {
      setError('Failed to load donation data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditingId(null); setForm(blankForm); setShowForm(true) }
  const openEdit = (r: Donation) => {
    setEditingId(r.id)
    setForm({
      alumni: String(r.alumni),
      campaign_name: r.campaign_name,
      amount: r.amount,
      currency: r.currency,
      payment_method: r.payment_method,
      donation_date: r.donation_date,
      reference: r.reference,
      status: r.status,
      is_anonymous: r.is_anonymous,
      notes: r.notes,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.alumni) { setError('Please select an alumnus.'); return }
    if (!form.amount || Number(form.amount) <= 0) { setError('Enter a valid donation amount.'); return }
    setIsProcessing(true)
    try {
      const payload = { ...form, alumni: Number(form.alumni), amount: Number(form.amount) }
      if (editingId) {
        await apiClient.patch(`/alumni/donations/${editingId}/`, payload)
      } else {
        await apiClient.post('/alumni/donations/', payload)
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
      await apiClient.delete(`/alumni/donations/${deleteTarget.id}/`)
      setDeleteTarget(null); await load()
    } catch { setError('Failed to delete.') }
    finally { setIsDeleting(false) }
  }

  const filtered = filterStatus === 'all' ? records : records.filter(r => r.status === filterStatus)
  const totalReceived = records.filter(r => r.status === 'received' || r.status === 'acknowledged')
    .reduce((s, r) => s + Number(r.amount), 0)
  const totalPledged = records.filter(r => r.status === 'pledged')
    .reduce((s, r) => s + Number(r.amount), 0)

  return (
    <div className="space-y-6">
      <PageHero
        title="Donations & Fundraising"
        subtitle="Track alumni contributions, campaigns, and fundraising progress."
        icon={<Heart size={22} className="text-rose-400" />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Donations', value: records.length, color: 'text-white', prefix: '' },
          { label: 'Received (KES)', value: totalReceived.toLocaleString(), color: 'text-emerald-400', prefix: '' },
          { label: 'Pledged (KES)', value: totalPledged.toLocaleString(), color: 'text-amber-400', prefix: '' },
          { label: 'Donors', value: new Set(records.map(r => r.alumni)).size, color: 'text-slate-300', prefix: '' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={GLASS}>
            <p className={`text-xl font-bold ${s.color}`}>{s.prefix}{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          {['all', ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'border border-white/10 text-slate-400 hover:bg-white/5'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/25 transition-colors">
          <Plus size={15} /> Record Donation
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-6" style={GLASS}>
          <h3 className="text-base font-semibold text-white mb-4">{editingId ? 'Edit Donation' : 'Record Donation'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Alumnus *</label>
              <select value={form.alumni} onChange={e => setForm(f => ({ ...f, alumni: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required>
                <option value="">Select alumnus…</option>
                {alumniList.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name} ({a.graduation_year})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Campaign</label>
              <input type="text" value={form.campaign_name} onChange={e => setForm(f => ({ ...f, campaign_name: e.target.value }))}
                placeholder="e.g. Library Fund, Bursary 2026"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200"
                min="1" step="0.01" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Currency</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                <option>KES</option><option>USD</option><option>GBP</option><option>EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Payment Method</label>
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Donation Date *</label>
              <input type="date" value={form.donation_date} onChange={e => setForm(f => ({ ...f, donation_date: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Reference / Receipt</label>
              <input type="text" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="Transaction ref, cheque number…"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <input type="checkbox" id="anon" checked={form.is_anonymous} onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))}
                className="rounded border-white/20" />
              <label htmlFor="anon" className="text-sm text-slate-300">Anonymous donation</label>
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
                {isProcessing ? 'Saving…' : editingId ? 'Update' : 'Record Donation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl p-8 text-center text-slate-500 text-sm" style={GLASS}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={GLASS}>
          <TrendingUp size={32} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400 text-sm">No donation records yet.</p>
          <p className="text-slate-600 text-xs mt-1">Record alumni contributions and track your fundraising campaigns.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {['Alumnus', 'Campaign', 'Amount', 'Method', 'Date', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{r.alumni_name}</p>
                    <p className="text-xs text-slate-500">Class of {r.alumni_graduation_year}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{r.campaign_name}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-emerald-300">{Number(r.amount).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{r.currency}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{METHOD_LABEL[r.payment_method] ?? r.payment_method}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.donation_date}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? 'bg-slate-500/15 text-slate-400'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(r)} className="rounded-lg px-3 py-1 text-xs border border-white/10 text-slate-300 hover:bg-white/5">Edit</button>
                      <button onClick={() => setDeleteTarget(r)} className="rounded-lg px-3 py-1 text-xs border border-rose-500/30 text-rose-400 hover:bg-rose-500/10">Del</button>
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
        title="Delete Donation Record"
        message={`Delete donation record from "${deleteTarget?.alumni_name}"?`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

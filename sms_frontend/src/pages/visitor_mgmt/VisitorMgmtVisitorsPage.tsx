import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { Plus, Trash2, LogOut } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const INP = 'w-full rounded-lg border border-white/[0.09] bg-slate-950 text-white px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50'
const SEL = 'w-full rounded-lg border border-white/[0.09] bg-slate-950 text-white px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50'

type Visitor = {
  id: number
  full_name: string
  id_number: string
  phone: string
  visitor_type: string
  purpose: string
  host_name: string
  badge_number: string
  sign_in_time: string
  sign_out_time: string | null
  status: string
  notes: string
}

type Form = {
  full_name: string; id_number: string; phone: string
  visitor_type: string; purpose: string; host_name: string
  badge_number: string; notes: string
}

const EMPTY: Form = {
  full_name: '', id_number: '', phone: '', visitor_type: 'Other',
  purpose: '', host_name: '', badge_number: '', notes: '',
}

const VISITOR_TYPES = ['Parent', 'Contractor', 'Official', 'Vendor', 'Other']

export default function VisitorMgmtVisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [signingOut, setSigningOut] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'In' | 'Out'>('all')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (filter !== 'all') params.status = filter
      const r = await apiClient.get<{ results?: Visitor[] } | Visitor[]>('/visitors/visitors/', { params })
      const data = r.data
      setVisitors(Array.isArray(data) ? data : (data as { results?: Visitor[] }).results ?? [])
    } catch {
      setError('Unable to load visitors. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [filter])

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 4000) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await apiClient.post('/visitors/visitors/', form)
      flash('Visitor signed in successfully.')
      setForm(EMPTY)
      setShowForm(false)
      void load()
    } catch {
      setError('Unable to sign in visitor.')
    } finally {
      setSaving(false)
    }
  }

  const signOut = async (id: number) => {
    setSigningOut(id)
    setError(null)
    try {
      await apiClient.post(`/visitors/visitors/${id}/sign_out/`, {})
      flash('Visitor signed out.')
      void load()
    } catch {
      setError('Unable to sign out visitor.')
    } finally {
      setSigningOut(null)
    }
  }

  const deleteVisitor = async (id: number) => {
    if (!window.confirm('Delete this visitor record?')) return
    setDeletingId(id)
    try {
      await apiClient.delete(`/visitors/visitors/${id}/`)
      flash('Visitor removed.')
      setVisitors(v => v.filter(x => x.id !== id))
    } catch {
      setError('Unable to delete visitor.')
    } finally {
      setDeletingId(null)
    }
  }

  const fmt = (dt: string) => {
    try { return new Date(dt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) } catch { return dt }
  }

  return (
    <div className="space-y-6">
      <PageHero badge="VISITORS" badgeColor="sky" title="Visitor Register" subtitle="Sign-in/out log for all school visitors" icon="🪪" />

      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['all', 'In', 'Out'] as const).map(f => (
            <button
              key={f}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === f ? 'bg-emerald-500 text-slate-900' : 'border border-white/[0.09] text-slate-400'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All Today' : f === 'In' ? 'Signed In' : 'Signed Out'}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900"
          onClick={() => { setForm(EMPTY); setShowForm(true) }}
        >
          <Plus size={13} /> Sign In Visitor
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-5" style={GLASS}>
          <h3 className="text-sm font-semibold text-emerald-400 mb-4">New Visitor Sign-In</h3>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={e => void handleSubmit(e)}>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Full Name *</label>
              <input className={INP} value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">ID / Passport Number</label>
              <input className={INP} value={form.id_number} onChange={e => setForm(p => ({ ...p, id_number: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Phone</label>
              <input className={INP} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Visitor Type</label>
              <select className={SEL} value={form.visitor_type} onChange={e => setForm(p => ({ ...p, visitor_type: e.target.value }))}>
                {VISITOR_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Purpose *</label>
              <input className={INP} value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Person / Dept Being Visited</label>
              <input className={INP} value={form.host_name} onChange={e => setForm(p => ({ ...p, host_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Badge Number</label>
              <input className={INP} value={form.badge_number} onChange={e => setForm(p => ({ ...p, badge_number: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Notes</label>
              <input className={INP} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70" disabled={saving}>
                {saving ? 'Signing In...' : 'Sign In Visitor'}
              </button>
              <button type="button" className="rounded-lg border border-white/[0.09] px-4 py-2 text-sm text-slate-300" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl p-5" style={GLASS}>
        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading visitors...</p>
        ) : visitors.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No visitors found for the selected filter.</p>
        ) : (
          <div className="space-y-2">
            {visitors.map(v => (
              <div key={v.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.07] p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white text-sm">{v.full_name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.status === 'In' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                      {v.status === 'In' ? '● Signed In' : 'Signed Out'}
                    </span>
                    <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-300">{v.visitor_type}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{v.purpose}{v.host_name ? ` · Visiting: ${v.host_name}` : ''}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    In: {fmt(v.sign_in_time)}
                    {v.sign_out_time ? ` · Out: ${fmt(v.sign_out_time)}` : ''}
                    {v.phone ? ` · ${v.phone}` : ''}
                    {v.badge_number ? ` · Badge #${v.badge_number}` : ''}
                    {v.id_number ? ` · ID: ${v.id_number}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {v.status === 'In' && (
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-lg border border-amber-500/30 px-2 py-1 text-[11px] text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                      disabled={signingOut === v.id}
                      onClick={() => void signOut(v.id)}
                    >
                      <LogOut size={11} />
                      {signingOut === v.id ? '...' : 'Sign Out'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-lg border border-rose-500/30 p-1.5 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                    disabled={deletingId === v.id}
                    onClick={() => void deleteVisitor(v.id)}
                    title="Delete record"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

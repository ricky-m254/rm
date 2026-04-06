import { useState } from 'react'
import { apiClient } from '../../api/client'
import { Bus, Plus, Trash2, AlertCircle, Check, MapPin } from 'lucide-react'
import PageHero from '../../components/PageHero'

const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition placeholder:text-slate-600'

interface TransportRoute { name: string; stops: string; monthly_fee: number; vehicle: string }

export default function SettingsTransportConfigPage() {
  const [routes, setRoutes] = useState<TransportRoute[]>([
    { name: 'Route A — CBD', stops: 'School → Town Centre → Railway Station → CBD', monthly_fee: 2500, vehicle: 'KCA 123A' },
    { name: 'Route B — Eastlands', stops: 'School → Umoja → Donholm → Buruburu', monthly_fee: 2000, vehicle: 'KCB 456B' },
  ])
  const [feePolicy, setFeePolicy] = useState('monthly')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [parentTracking, setParentTracking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const save = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      await apiClient.patch('/school/profile/', {
        transport_config: { routes, fee_policy: feePolicy, emergency_contact: emergencyContact, parent_tracking: parentTracking }
      })
      setSuccess('Transport configuration saved.')
    } catch { setError('Failed to save.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHero
        badge="SETTINGS"
        badgeColor="slate"
        title="Transport Config"
        subtitle="Route setup and vehicle management rules"
        icon="⚙️"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Transport Configuration</h1>
        <p className="mt-1 text-sm text-slate-400">Configure bus routes, stops, vehicle assignments, transport fees, and student allocation policies.</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{success}</div>}

      {/* General Settings */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Bus className="h-4 w-4 text-amber-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">General Settings</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Transport Fee Policy</label>
            <select value={feePolicy} onChange={e => setFeePolicy(e.target.value)} className={cls}>
              <option value="monthly">Monthly</option>
              <option value="per_term">Per Term</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Emergency Contact Number</label>
            <input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} placeholder="+254 700 000 000" className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={parentTracking} onChange={e => setParentTracking(e.target.checked)} className="rounded" />
              <span className="text-sm text-slate-300">Enable real-time bus tracking notifications for parents</span>
            </label>
            <p className="text-[10px] text-slate-500 mt-1 ml-5">Sends SMS to parents when bus departs school and arrives at stops.</p>
          </div>
        </div>
      </section>

      {/* Routes */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sky-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Bus Routes</h2></div>
        <div className="space-y-4">
          {routes.map((r, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <input value={r.name} onChange={e => setRoutes(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Route name" className={`${cls} font-semibold`} />
                <button onClick={() => setRoutes(p => p.filter((_, j) => j !== i))} className="mt-2 text-slate-600 hover:text-rose-400 transition flex-shrink-0"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Stops (comma-separated)</label>
                <input value={r.stops} onChange={e => setRoutes(p => p.map((x, j) => j === i ? { ...x, stops: e.target.value } : x))} placeholder="Stop A → Stop B → Stop C" className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Fee (Ksh)</label>
                  <input type="number" value={r.monthly_fee} onChange={e => setRoutes(p => p.map((x, j) => j === i ? { ...x, monthly_fee: +e.target.value } : x))} className={cls} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Assigned Vehicle</label>
                  <input value={r.vehicle} onChange={e => setRoutes(p => p.map((x, j) => j === i ? { ...x, vehicle: e.target.value } : x))} placeholder="KCA 123A" className={cls} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setRoutes(p => [...p, { name: '', stops: '', monthly_fee: 0, vehicle: '' }])}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300">
          <Plus className="h-3.5 w-3.5" /> Add Route
        </button>
      </section>

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          {saving ? 'Saving…' : 'Save Transport Configuration'}
        </button>
      </div>
    </div>
  )
}

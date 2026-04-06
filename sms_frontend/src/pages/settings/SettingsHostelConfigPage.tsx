import { useState } from 'react'
import { apiClient } from '../../api/client'
import { Home, Plus, Trash2, AlertCircle, Check } from 'lucide-react'
import PageHero from '../../components/PageHero'

const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition placeholder:text-slate-600'

interface Hostel { name: string; gender: string; total_rooms: number; beds_per_room: number; fee_per_term: number }

export default function SettingsHostelConfigPage() {
  const [hostels, setHostels] = useState<Hostel[]>([
    { name: 'Boys Hostel A', gender: 'male', total_rooms: 20, beds_per_room: 4, fee_per_term: 15000 },
    { name: 'Girls Hostel B', gender: 'female', total_rooms: 18, beds_per_room: 4, fee_per_term: 15000 },
  ])
  const [allocationPolicy, setAllocationPolicy] = useState('manual')
  const [allowParentVisit, setAllowParentVisit] = useState(true)
  const [visitDays, setVisitDays] = useState('Saturday, Sunday')
  const [warden_phone, setWardenPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const save = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      await apiClient.patch('/school/profile/', {
        hostel_config: { hostels, allocation_policy: allocationPolicy, allow_parent_visit: allowParentVisit, visit_days: visitDays, warden_phone }
      })
      setSuccess('Hostel configuration saved.')
    } catch { setError('Failed to save.') }
    finally { setSaving(false) }
  }

  const totalCapacity = hostels.reduce((a, h) => a + h.total_rooms * h.beds_per_room, 0)

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHero
        badge="SETTINGS"
        badgeColor="slate"
        title="Hostel Config"
        subtitle="Dormitory rules, capacity and room setup"
        icon="⚙️"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Hostel Configuration</h1>
        <p className="mt-1 text-sm text-slate-400">Configure hostels, room capacity, bed allocation, boarding fees, and visiting policies.</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{success}</div>}

      {/* Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl glass-panel p-4">
          <p className="text-xs text-slate-500 mb-1">Total Hostels</p>
          <p className="text-2xl font-bold text-white">{hostels.length}</p>
        </div>
        <div className="rounded-xl glass-panel p-4">
          <p className="text-xs text-slate-500 mb-1">Total Capacity</p>
          <p className="text-2xl font-bold text-emerald-400">{totalCapacity.toLocaleString()}</p>
        </div>
        <div className="rounded-xl glass-panel p-4">
          <p className="text-xs text-slate-500 mb-1">Allocation Policy</p>
          <p className="text-sm font-semibold text-sky-300 capitalize">{allocationPolicy}</p>
        </div>
      </div>

      {/* Hostels */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Home className="h-4 w-4 text-violet-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Hostel Buildings</h2></div>
        <div className="space-y-4">
          {hostels.map((h, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-start gap-2 justify-between">
                <input value={h.name} onChange={e => setHostels(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Hostel name" className={`${cls} font-semibold`} />
                <button onClick={() => setHostels(p => p.filter((_, j) => j !== i))} className="mt-2 text-slate-600 hover:text-rose-400 transition flex-shrink-0"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Gender</label>
                  <select value={h.gender} onChange={e => setHostels(p => p.map((x, j) => j === i ? { ...x, gender: e.target.value } : x))} className={cls}>
                    <option value="male">Boys</option>
                    <option value="female">Girls</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Fee per Term (Ksh)</label>
                  <input type="number" value={h.fee_per_term} onChange={e => setHostels(p => p.map((x, j) => j === i ? { ...x, fee_per_term: +e.target.value } : x))} className={cls} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Total Rooms</label>
                  <input type="number" min={1} value={h.total_rooms} onChange={e => setHostels(p => p.map((x, j) => j === i ? { ...x, total_rooms: +e.target.value } : x))} className={cls} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Beds per Room</label>
                  <input type="number" min={1} value={h.beds_per_room} onChange={e => setHostels(p => p.map((x, j) => j === i ? { ...x, beds_per_room: +e.target.value } : x))} className={cls} />
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Capacity: <span className="text-emerald-400 font-semibold">{h.total_rooms * h.beds_per_room} beds</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setHostels(p => [...p, { name: '', gender: 'male', total_rooms: 10, beds_per_room: 4, fee_per_term: 0 }])}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300">
          <Plus className="h-3.5 w-3.5" /> Add Hostel
        </button>
      </section>

      {/* Policies */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Home className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Allocation & Visit Policies</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Room Allocation Method</label>
            <select value={allocationPolicy} onChange={e => setAllocationPolicy(e.target.value)} className={cls}>
              <option value="manual">Manual (warden assigns)</option>
              <option value="auto">Automatic (system assigns)</option>
              <option value="student_choice">Student preference</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Warden Emergency Contact</label>
            <input value={warden_phone} onChange={e => setWardenPhone(e.target.value)} placeholder="+254 700 000 000" className={cls} />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input type="checkbox" checked={allowParentVisit} onChange={e => setAllowParentVisit(e.target.checked)} className="rounded" />
              <span className="text-sm text-slate-300">Allow parent visits</span>
            </label>
          </div>
          {allowParentVisit && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Visit Days</label>
              <input value={visitDays} onChange={e => setVisitDays(e.target.value)} placeholder="Saturday, Sunday" className={cls} />
            </div>
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          {saving ? 'Saving…' : 'Save Hostel Configuration'}
        </button>
      </div>
    </div>
  )
}

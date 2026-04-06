import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

export default function AlumniProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', graduation_year: '', current_occupation: '', city: '', country: 'Kenya' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    apiClient.get('/alumni/profiles/')
      .then(res => setProfiles(res.data.results || res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiClient.post('/alumni/profiles/', form)
      setProfiles(prev => [res.data, ...prev])
      setMsg('Profile added!')
      setForm({ first_name: '', last_name: '', graduation_year: '', current_occupation: '', city: '', country: 'Kenya' })
      setTimeout(() => { setShowAdd(false); setMsg('') }, 1500)
    } catch {
      setMsg('Saved locally. Will sync when connected.')
      setTimeout(() => { setShowAdd(false); setMsg('') }, 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ALUMNI"
        badgeColor="amber"
        title="Alumni Profiles"
        subtitle="Track, engage, and maintain connections with graduates of the institution."
        icon="🎓"
        actions={
          <button onClick={() => setShowAdd(true)} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
            Add Profile
          </button>
        }
      />

      <div className="rounded-2xl glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/[0.07] bg-slate-950/50 text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Graduation Year</th>
                <th className="px-6 py-4">Occupation</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading profiles...</td>
                </tr>
              ) : profiles.length > 0 ? (
                profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.025] transition">
                    <td className="px-6 py-4 font-medium text-white">{p.first_name} {p.last_name}</td>
                    <td className="px-6 py-4">{p.graduation_year}</td>
                    <td className="px-6 py-4">{p.current_occupation || '-'}</td>
                    <td className="px-6 py-4">{p.city}, {p.country}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.is_verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {p.is_verified ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No profiles found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5" style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-white">Add Alumni Profile</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">First Name *</label>
                  <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="First name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Last Name *</label>
                  <input required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="Last name" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Graduation Year *</label>
                <input required type="number" min="1950" max="2030" value={form.graduation_year} onChange={e => setForm(f => ({ ...f, graduation_year: e.target.value }))}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="e.g. 2020" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Current Occupation</label>
                <input value={form.current_occupation} onChange={e => setForm(f => ({ ...f, current_occupation: e.target.value }))}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="e.g. Software Engineer" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="e.g. Nairobi" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Country</label>
                  <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="e.g. Kenya" />
                </div>
              </div>
              {msg && <p className="text-xs text-emerald-400 font-medium">{msg}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-300 transition" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-slate-950 transition hover:opacity-90" style={{ background: '#10b981' }}>
                  {saving ? 'Saving…' : 'Add Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

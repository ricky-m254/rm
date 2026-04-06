import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Club = { id: number; name: string; club_type: string; description: string; meeting_day: string; meeting_time: string; is_active: boolean }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function SportsClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [clubType, setClubType] = useState('Sports')
  const [description, setDescription] = useState('')
  const [meetingDay, setMeetingDay] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Club | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { const r = await apiClient.get<Club[] | { results: Club[] }>('/sports/clubs/'); setClubs(asArray(r.data)) }
    catch { setError('Unable to load clubs.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const reset = () => { setEditingId(null); setName(''); setClubType('Sports'); setDescription(''); setMeetingDay(''); setMeetingTime('') }

  const startEdit = (c: Club) => {
    setEditingId(c.id); setName(c.name); setClubType(c.club_type)
    setDescription(c.description); setMeetingDay(c.meeting_day); setMeetingTime(c.meeting_time)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true); setError(null); setNotice(null)
    const payload = { name: name.trim(), club_type: clubType, description, meeting_day: meetingDay, meeting_time: meetingTime }
    try {
      if (editingId) { await apiClient.patch(`/sports/clubs/${editingId}/`, payload); setNotice('Club updated.') }
      else { await apiClient.post('/sports/clubs/', payload); setNotice('Club created.') }
      reset(); await load()
    } catch { setError('Unable to save club.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/sports/clubs/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete club.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="SPORTS & CO-CURRICULAR"
        badgeColor="amber"
        title="Clubs & Societies"
        subtitle="Manage sports teams, clubs, and extracurricular groups."
        icon="🏆"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="rounded-2xl glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">{editingId ? 'Edit Club' : 'New Club'}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Club name *" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <select value={clubType} onChange={e => setClubType(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option>Sports</option><option>Academic</option><option>Arts</option><option>Community</option><option>Other</option>
          </select>
          <input value={meetingDay} onChange={e => setMeetingDay(e.target.value)} placeholder="Meeting day (e.g. Wednesday)" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <input value={meetingTime} onChange={e => setMeetingTime(e.target.value)} placeholder="Meeting time (e.g. 4:00 PM)" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={save} disabled={saving || !name.trim()} className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Update Club' : 'Create Club'}</button>
          {editingId ? <button onClick={reset} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200">Cancel</button> : null}
        </div>
      </div>

      <div className="rounded-2xl glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">All Clubs ({clubs.length})</h2>
        {loading ? <p className="text-sm text-slate-400">Loading…</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map(c => (
              <div key={c.id} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-100">{c.name}</p>
                    <span className="mt-1 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">{c.club_type}</span>
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs">
                    <button onClick={() => startEdit(c)} className="font-semibold text-emerald-400 hover:text-emerald-300">Edit</button>
                    <button onClick={() => setDeleteTarget(c)} className="font-semibold text-rose-400 hover:text-rose-300">Delete</button>
                  </div>
                </div>
                {c.description ? <p className="mt-2 text-xs text-slate-400 line-clamp-2">{c.description}</p> : null}
                {c.meeting_day ? <p className="mt-1 text-xs text-slate-500">{c.meeting_day} {c.meeting_time}</p> : null}
              </div>
            ))}
            {clubs.length === 0 ? <p className="col-span-3 text-sm text-slate-500">No clubs found. Create one above.</p> : null}
          </div>
        )}
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Club" description={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

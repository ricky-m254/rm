import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Club = { id: number; name: string }
type Tournament = { id: number; name: string; club: number | null; club_name?: string; start_date: string; end_date: string | null; location: string; result: string; position_achieved: string; notes: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function SportsTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [clubId, setClubId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [result, setResult] = useState('')
  const [positionAchieved, setPositionAchieved] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [tRes, cRes] = await Promise.all([
        apiClient.get<Tournament[] | { results: Tournament[] }>('/sports/tournaments/'),
        apiClient.get<Club[] | { results: Club[] }>('/sports/clubs/'),
      ])
      setTournaments(asArray(tRes.data)); setClubs(asArray(cRes.data))
    } catch { setError('Unable to load tournaments.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const reset = () => { setEditingId(null); setName(''); setClubId(''); setStartDate(''); setEndDate(''); setLocation(''); setResult(''); setPositionAchieved(''); setNotes('') }

  const startEdit = (t: Tournament) => {
    setEditingId(t.id); setName(t.name); setClubId(t.club ? String(t.club) : '')
    setStartDate(t.start_date); setEndDate(t.end_date || ''); setLocation(t.location)
    setResult(t.result); setPositionAchieved(t.position_achieved); setNotes(t.notes)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    if (!name.trim() || !startDate) return
    setSaving(true); setError(null); setNotice(null)
    const payload = { name: name.trim(), club: clubId ? Number(clubId) : null, start_date: startDate, end_date: endDate || null, location, result, position_achieved: positionAchieved, notes }
    try {
      if (editingId) { await apiClient.patch(`/sports/tournaments/${editingId}/`, payload); setNotice('Tournament updated.') }
      else { await apiClient.post('/sports/tournaments/', payload); setNotice('Tournament created.') }
      reset(); await load()
    } catch { setError('Unable to save tournament.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/sports/tournaments/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete tournament.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="SPORTS & CO-CURRICULAR"
        badgeColor="amber"
        title="Tournaments"
        subtitle="Schedule and track tournament results."
        icon="🏆"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="rounded-2xl glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">{editingId ? 'Edit Tournament' : 'New Tournament'}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Tournament name *" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <select value={clubId} onChange={e => setClubId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option value="">No club</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Start Date *</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          </div>
          <input value={positionAchieved} onChange={e => setPositionAchieved(e.target.value)} placeholder="Position achieved (e.g. 1st)" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <textarea value={result} onChange={e => setResult(e.target.value)} placeholder="Result summary" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-3" />
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={save} disabled={saving || !name.trim() || !startDate} className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Update' : 'Create Tournament'}</button>
          {editingId ? <button onClick={reset} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200">Cancel</button> : null}
        </div>
      </div>

      <div className="rounded-2xl glass-panel overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Tournament</th>
              <th className="px-4 py-3 font-medium">Club</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr> : tournaments.map(t => (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-semibold text-slate-200">{t.name}<br/><span className="text-xs text-slate-500">{t.location}</span></td>
                <td className="px-4 py-3 text-slate-300">{t.club_name || '-'}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{t.start_date}{t.end_date ? ` → ${t.end_date}` : ''}</td>
                <td className="px-4 py-3">
                  {t.position_achieved ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">{t.position_achieved}</span> : <span className="text-slate-500">-</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => startEdit(t)} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">Edit</button>
                    <button onClick={() => setDeleteTarget(t)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && tournaments.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No tournaments found.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Tournament" description={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Users, Plus, X, AlertTriangle, Star } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import ConfirmDialog from '../../components/ConfirmDialog'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type AlumniProfile = { id: number; first_name: string; last_name: string; graduation_year: number; current_occupation: string }
type Mentorship = {
  id: number
  mentor: number
  mentor_name: string
  mentor_occupation: string
  mentee_name: string
  mentee_type: string
  industry: string
  skills_offered: string
  areas_of_interest: string
  status: string
  started_at: string | null
  ended_at: string | null
  notes: string
  created_at: string
}

const STATUSES = ['open', 'matched', 'active', 'completed', 'paused']
const STATUS_COLOR: Record<string, string> = {
  open: 'bg-emerald-500/15 text-emerald-300',
  matched: 'bg-blue-500/15 text-blue-300',
  active: 'bg-violet-500/15 text-violet-300',
  completed: 'bg-slate-500/15 text-slate-400',
  paused: 'bg-amber-500/15 text-amber-300',
}

export default function AlumniMentorshipPage() {
  const [records, setRecords] = useState<Mentorship[]>([])
  const [alumniList, setAlumniList] = useState<AlumniProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const blankForm = {
    mentor: '',
    mentee_name: '',
    mentee_type: 'student',
    industry: '',
    skills_offered: '',
    areas_of_interest: '',
    status: 'open',
    started_at: '',
    ended_at: '',
    notes: '',
  }
  const [form, setForm] = useState(blankForm)
  const [isProcessing, setIsProcessing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Mentorship | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const [mr, ar] = await Promise.all([
        apiClient.get<Mentorship[]>('/alumni/mentorships/'),
        apiClient.get<AlumniProfile[]>('/alumni/profiles/'),
      ])
      setRecords(mr.data)
      setAlumniList(ar.data)
    } catch {
      setError('Failed to load mentorship data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditingId(null); setForm(blankForm); setShowForm(true) }
  const openEdit = (r: Mentorship) => {
    setEditingId(r.id)
    setForm({
      mentor: String(r.mentor),
      mentee_name: r.mentee_name,
      mentee_type: r.mentee_type,
      industry: r.industry,
      skills_offered: r.skills_offered,
      areas_of_interest: r.areas_of_interest,
      status: r.status,
      started_at: r.started_at ?? '',
      ended_at: r.ended_at ?? '',
      notes: r.notes,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.mentor) { setError('Please select a mentor.'); return }
    setIsProcessing(true)
    try {
      const payload = {
        ...form,
        mentor: Number(form.mentor),
        started_at: form.started_at || null,
        ended_at: form.ended_at || null,
      }
      if (editingId) {
        await apiClient.patch(`/alumni/mentorships/${editingId}/`, payload)
      } else {
        await apiClient.post('/alumni/mentorships/', payload)
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
      await apiClient.delete(`/alumni/mentorships/${deleteTarget.id}/`)
      setDeleteTarget(null); await load()
    } catch { setError('Failed to delete.') }
    finally { setIsDeleting(false) }
  }

  const filtered = filterStatus === 'all' ? records : records.filter(r => r.status === filterStatus)
  const summary = { open: records.filter(r => r.status === 'open').length, active: records.filter(r => r.status === 'active').length }

  return (
    <div className="space-y-6">
      <PageHero
        title="Mentorship Programme"
        subtitle="Connect alumni mentors with current students and fellow alumni for career guidance."
        icon={<Users size={22} className="text-violet-400" />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Mentors', value: records.length, color: 'text-white' },
          { label: 'Open / Seeking', value: summary.open, color: 'text-emerald-400' },
          { label: 'Active', value: summary.active, color: 'text-violet-400' },
          { label: 'Completed', value: records.filter(r => r.status === 'completed').length, color: 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={GLASS}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
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
          className="flex items-center gap-2 rounded-xl bg-violet-500/15 border border-violet-500/30 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/25 transition-colors">
          <Plus size={15} /> Register Mentor
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-6" style={GLASS}>
          <h3 className="text-base font-semibold text-white mb-4">{editingId ? 'Edit Mentorship' : 'Register Mentor'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mentor (Alumni) *</label>
              <select value={form.mentor} onChange={e => setForm(f => ({ ...f, mentor: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" required>
                <option value="">Select alumnus…</option>
                {alumniList.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name} ({a.graduation_year})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Industry / Field</label>
              <input type="text" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="e.g. Technology, Finance, Medicine"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mentee Name</label>
              <input type="text" value={form.mentee_name} onChange={e => setForm(f => ({ ...f, mentee_name: e.target.value }))}
                placeholder="Leave blank if seeking mentee"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mentee Type</label>
              <select value={form.mentee_type} onChange={e => setForm(f => ({ ...f, mentee_type: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                <option value="student">Student</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Started</label>
              <input type="date" value={form.started_at} onChange={e => setForm(f => ({ ...f, started_at: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Skills Offered</label>
              <textarea value={form.skills_offered} onChange={e => setForm(f => ({ ...f, skills_offered: e.target.value }))}
                rows={2} placeholder="Skills and expertise the mentor can share…"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Areas of Interest</label>
              <textarea value={form.areas_of_interest} onChange={e => setForm(f => ({ ...f, areas_of_interest: e.target.value }))}
                rows={2} placeholder="Topics the mentee is interested in…"
                className="w-full rounded-xl border border-white/10 bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={isProcessing}
                className="rounded-xl bg-violet-500/20 border border-violet-500/30 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/30 disabled:opacity-50">
                {isProcessing ? 'Saving…' : editingId ? 'Update' : 'Register Mentor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl p-8 text-center text-slate-500 text-sm" style={GLASS}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={GLASS}>
          <Star size={32} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400 text-sm">No mentorship records found.</p>
          <p className="text-slate-600 text-xs mt-1">Register alumni who are willing to mentor students or fellow alumni.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(r => (
            <div key={r.id} className="rounded-2xl p-5" style={GLASS}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-200">{r.mentor_name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[r.status] ?? 'bg-slate-500/15 text-slate-400'}`}>
                      {r.status}
                    </span>
                  </div>
                  {r.mentor_occupation && <p className="text-xs text-slate-500 mt-0.5">{r.mentor_occupation}</p>}
                  {r.industry && <p className="text-xs text-emerald-400 mt-1">{r.industry}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="rounded-lg px-2 py-1 text-xs border border-white/10 text-slate-300 hover:bg-white/5">Edit</button>
                  <button onClick={() => setDeleteTarget(r)} className="rounded-lg px-2 py-1 text-xs border border-rose-500/30 text-rose-400 hover:bg-rose-500/10">Del</button>
                </div>
              </div>
              {r.mentee_name && (
                <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                  <p className="text-xs text-slate-400">Mentee: <span className="text-slate-200 font-medium">{r.mentee_name}</span> <span className="text-slate-600">({r.mentee_type})</span></p>
                </div>
              )}
              {r.skills_offered && (
                <p className="mt-2 text-xs text-slate-500 line-clamp-2">Skills: {r.skills_offered}</p>
              )}
              {r.started_at && (
                <p className="mt-1 text-[10px] text-slate-600">Started: {r.started_at}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Mentorship Record"
        message={`Delete mentorship record for ${deleteTarget?.mentor_name}?`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

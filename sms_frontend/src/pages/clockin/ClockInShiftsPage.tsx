import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Shift = {
  id: number
  name: string
  person_type: 'ALL' | 'STUDENT' | 'STAFF'
  expected_arrival: string
  grace_period_minutes: number
  expected_departure: string | null
  is_active: boolean
  notes: string
}

export default function ClockInShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    person_type: 'ALL' as const,
    expected_arrival: '07:30',
    grace_period_minutes: 15,
    expected_departure: '15:30',
    notes: '',
  })

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [editShift, setEditShift] = useState<Shift | null>(null)
  const [editForm, setEditForm] = useState({
    name: '', person_type: 'ALL' as Shift['person_type'],
    expected_arrival: '', grace_period_minutes: 15,
    expected_departure: '', notes: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  function openEdit(shift: Shift) {
    setEditShift(shift)
    setEditForm({
      name: shift.name,
      person_type: shift.person_type,
      expected_arrival: shift.expected_arrival,
      grace_period_minutes: shift.grace_period_minutes,
      expected_departure: shift.expected_departure ?? '',
      notes: shift.notes ?? '',
    })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editShift) return
    setIsSaving(true)
    try {
      const res = await apiClient.patch<Shift>(`/clockin/shifts/${editShift.id}/`, editForm)
      setShifts(prev => prev.map(s => s.id === editShift.id ? res.data : s))
      setEditShift(null)
    } catch {
      setError('Failed to save shift changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const fetchShifts = async () => {
    try {
      const res = await apiClient.get<Shift[]>('/clockin/shifts/')
      setShifts(res.data)
    } catch {
      setError('Unable to load shifts.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchShifts()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      await apiClient.post('/clockin/shifts/', formData)
      setFormData({ name: '', person_type: 'ALL', expected_arrival: '07:30', grace_period_minutes: 15, expected_departure: '15:30', notes: '' })
      setIsAdding(false)
      setShowAddForm(false)
      fetchShifts()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add shift.')
      setIsAdding(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await apiClient.delete(`/clockin/shifts/${deleteId}/`)
      setDeleteId(null)
      fetchShifts()
    } catch {
      setError('Failed to delete shift.')
    } finally {
      setIsDeleting(false)
    }
  }

  const INPUT_CLS = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm focus:border-emerald-500 transition outline-none'

  return (
    <div className="space-y-6 font-sans text-slate-100">
      {/* Edit Shift Modal */}
      {editShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <form onSubmit={handleEdit} className="w-full max-w-lg rounded-3xl border p-6 space-y-4" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-display font-bold text-white">Edit Shift: {editShift.name}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Shift Name</label>
                <input required className={INPUT_CLS} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Applicable To</label>
                <select className={INPUT_CLS} value={editForm.person_type} onChange={e => setEditForm(f => ({ ...f, person_type: e.target.value as Shift['person_type'] }))}>
                  <option value="ALL">All Students & Staff</option>
                  <option value="STUDENT">Students Only</option>
                  <option value="STAFF">Staff Only</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Grace Period (min)</label>
                <input type="number" min="0" max="120" className={INPUT_CLS} value={editForm.grace_period_minutes} onChange={e => setEditForm(f => ({ ...f, grace_period_minutes: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Expected Arrival</label>
                <input type="time" className={INPUT_CLS} value={editForm.expected_arrival} onChange={e => setEditForm(f => ({ ...f, expected_arrival: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Expected Departure</label>
                <input type="time" className={INPUT_CLS} value={editForm.expected_departure} onChange={e => setEditForm(f => ({ ...f, expected_departure: e.target.value }))} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Notes</label>
                <input className={INPUT_CLS} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditShift(null)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="flex-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-60" style={{ background: '#10b981', color: '#fff' }}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <PageHero
        badge="CLOCK-IN"
        badgeColor="emerald"
        title="Shifts"
        subtitle="Define work shifts and schedule templates"
        icon="⏰"
      />
      <header className="rounded-2xl glass-panel p-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-display font-semibold">Shift Schedule</h1>
          <p className="mt-2 text-sm text-slate-400">Configure school arrival times and late detection rules.</p>
          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition"
        >
          {showAddForm ? 'Cancel' : '+ New Shift'}
        </button>
      </header>

      {showAddForm && (
        <form onSubmit={handleAdd} className="rounded-2xl glass-panel p-6 space-y-4 animate-in fade-in slide-in-from-top-4 shadow-2xl">
          <h2 className="text-lg font-display font-semibold text-emerald-400">Define School Shift</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Shift Name</label>
              <input
                required
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm focus:border-emerald-500 transition outline-none"
                placeholder="Morning Session"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Applicable To</label>
              <select
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm focus:border-emerald-500 transition outline-none"
                value={formData.person_type}
                onChange={e => setFormData({ ...formData, person_type: e.target.value as any })}
              >
                <option value="ALL">All Students & Staff</option>
                <option value="STUDENT">Students Only</option>
                <option value="STAFF">Staff Only</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Expected Arrival</label>
              <input
                type="time"
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm focus:border-emerald-500 transition outline-none"
                value={formData.expected_arrival}
                onChange={e => setFormData({ ...formData, expected_arrival: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Grace Period (Minutes)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm focus:border-emerald-500 transition outline-none"
                value={formData.grace_period_minutes}
                onChange={e => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) })}
              />
              <p className="text-[10px] text-slate-500 mt-1">E.g. If 07:30 + 15m, Late after 07:45</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Expected Departure</label>
              <input
                type="time"
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm focus:border-emerald-500 transition outline-none"
                value={formData.expected_departure}
                onChange={e => setFormData({ ...formData, expected_departure: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Shift Notes</label>
              <input
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm focus:border-emerald-500 transition outline-none"
                placeholder="Public holidays or early days..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isAdding}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition disabled:opacity-50"
            >
              Confirm Shift
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-6">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading schedules...</div>
        ) : shifts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic rounded-2xl border border-white/[0.07] bg-white/[0.02]">No shifts defined yet.</div>
        ) : (
          shifts.map(shift => (
            <article key={shift.id} className="rounded-2xl glass-panel p-6 flex flex-col md:flex-row items-center gap-8 group">
              <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-white/[0.07] flex flex-col items-center justify-center">
                 <p className="text-[10px] font-bold text-slate-500 uppercase">Arrival</p>
                 <p className="text-xl font-bold text-emerald-400 font-mono tracking-tighter">{shift.expected_arrival}</p>
              </div>

              <div className="flex-1 space-y-2">
                 <div className="flex items-center gap-3">
                   <h3 className="text-xl font-display font-semibold text-slate-100">{shift.name}</h3>
                   <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300 uppercase">
                     {shift.person_type}
                   </span>
                   {shift.is_active ? (
                     <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE</span>
                   ) : (
                     <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">PAUSED</span>
                   )}
                 </div>
                 <div className="flex gap-6 text-sm text-slate-400">
                   <div className="flex items-center gap-1.5">
                     <span className="text-slate-600">Grace:</span>
                     <span className="font-bold text-amber-400">{shift.grace_period_minutes} min</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <span className="text-slate-600">Departure:</span>
                     <span className="font-bold text-slate-300 font-mono">{shift.expected_departure || 'N/A'}</span>
                   </div>
                 </div>
                 {shift.notes && <p className="text-xs text-slate-500 italic">"{shift.notes}"</p>}
              </div>

              <div className="flex flex-col gap-2 items-end">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Attendance Rule</p>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-300 italic">
                    Scans after <span className="text-amber-400">
                      {/* logic to calculate late time for display */}
                      {(() => {
                        const [h, m] = shift.expected_arrival.split(':').map(Number);
                        const date = new Date();
                        date.setHours(h, m + shift.grace_period_minutes);
                        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                      })()}
                    </span> marked LATE
                  </p>
                </div>
                <div className="pt-2 opacity-0 group-hover:opacity-100 transition flex gap-4">
                   <button onClick={() => openEdit(shift)} type="button" className="text-xs font-bold text-sky-400 hover:text-sky-300 uppercase">Edit</button>
                   <button 
                     onClick={() => setDeleteId(shift.id)}
                     className="text-xs font-bold text-rose-400 hover:text-rose-300 uppercase"
                   >
                     Delete
                   </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Shift Schedule"
        description="Are you sure you want to remove this shift? This will affect how late arrival is calculated for all future scans of people assigned to this shift."
        confirmLabel="Delete"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { User, Clock, Trash2, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface PTMSlot {
  id: number
  slot_time: string
  is_booked: boolean
  session_title: string
  booking_student_name?: string
  booking_parent_name?: string
  booking_notes?: string
}

export default function MyPTMSlotsPage() {
  const [slots, setSlots] = useState<PTMSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    apiClient.get('/ptm/my-slots/')
      .then(res => setSlots(Array.isArray(res.data) ? res.data : res.data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function deleteSlot(slotId: number) {
    if (!window.confirm('Delete this available slot? This cannot be undone.')) return
    setDeletingId(slotId)
    try {
      await apiClient.delete(`/ptm/slots/${slotId}/`)
      setSlots(prev => prev.filter(s => s.id !== slotId))
      showToast('Slot deleted successfully')
    } catch {
      showToast('Failed to delete slot', false)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className="fixed top-5 right-5 z-[9999] flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl"
          style={toast.ok
            ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }
            : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
        >
          {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <PageHero badge="PTM" badgeColor="violet" title="My PTM Slots" subtitle="Manage your available parent-teacher meeting slots" icon="🤝" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">My PTM Slots</h1>
          <p className="mt-1 text-sm text-slate-400">Manage your individual schedule for upcoming parent-teacher meetings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading your slots...</div>
        ) : slots.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 italic rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.02]">
            <Clock className="mx-auto h-12 w-12 text-slate-700 mb-3" />
            <p>You have no slots scheduled yet.</p>
          </div>
        ) : slots.map((slot) => (
          <div key={slot.id} className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
            slot.is_booked ? 'bg-emerald-500/10 border-emerald-500/30' : 'glass-panel border-white/[0.07]'
          }`}>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${slot.is_booked ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-lg font-bold text-white">{slot.slot_time}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 ${
                  slot.is_booked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400'
                }`}>
                  {slot.is_booked ? 'Booked' : 'Available'}
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{slot.session_title}</p>
                {slot.is_booked ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-slate-200">
                      <User className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold">{slot.booking_student_name}</span>
                    </div>
                    <p className="text-xs text-slate-400 italic">Parent: {slot.booking_parent_name}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 italic">No parent has booked this slot yet.</p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                {slot.is_booked ? (
                  <button
                    onClick={() => setExpandedNotes(expandedNotes === slot.id ? null : slot.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition"
                  >
                    <FileText size={12} />
                    {expandedNotes === slot.id ? 'Hide Notes' : 'Meeting Notes'}
                  </button>
                ) : (
                  <button
                    onClick={() => deleteSlot(slot.id)}
                    disabled={deletingId === slot.id}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-400 transition disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    {deletingId === slot.id ? 'Deleting...' : 'Delete Slot'}
                  </button>
                )}
              </div>
            </div>

            {/* Meeting Notes Panel */}
            {expandedNotes === slot.id && slot.is_booked && (
              <div className="border-t border-emerald-500/20 px-5 py-4" style={{ background: 'rgba(0,0,0,0.15)' }}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Parent Notes</p>
                {slot.booking_notes ? (
                  <p className="text-sm text-slate-300 leading-relaxed">{slot.booking_notes}</p>
                ) : (
                  <p className="text-sm text-slate-500 italic">No notes provided by the parent.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Calendar, User, Clock, ListChecks, Pencil, Trash2, X } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface Attendance {
  id: number
  student: number
  student_name: string
  date: string
  roll_call_time: 'Morning' | 'Evening' | 'Night'
  status: 'Present' | 'Absent' | 'Leave'
  recorded_by: number | null
  recorded_by_name: string
  notes: string
}

interface Student { id: number; first_name: string; last_name: string; admission_number: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

const ROLL_CALL_TIMES = ['Morning', 'Evening', 'Night']
const STATUSES = [
  { value: 'Present', label: 'Present' },
  { value: 'Absent', label: 'Absent' },
  { value: 'Leave', label: 'On Leave' },
]

const emptyForm = (date: string) => ({
  student: '', date, roll_call_time: 'Night', status: 'Present', notes: ''
})

export default function HostelAttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterTime, setFilterTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Attendance | null>(null)
  const [form, setForm] = useState(emptyForm(new Date().toISOString().split('T')[0]))
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [ra, rs] = await Promise.all([
        apiClient.get(`/hostel/attendance/?date=${selectedDate}`),
        apiClient.get('/students/'),
      ])
      setAttendance(asArray(ra.data))
      setStudents(asArray(rs.data))
    } catch { setError('Unable to load attendance.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [selectedDate])

  const filtered = filterTime ? attendance.filter(a => a.roll_call_time === filterTime) : attendance

  const openCreate = () => {
    setEditing(null); setForm(emptyForm(selectedDate)); setError(null); setModal(true)
  }

  const openEdit = (a: Attendance) => {
    setEditing(a)
    setForm({ student: String(a.student), date: a.date, roll_call_time: a.roll_call_time, status: a.status, notes: a.notes || '' })
    setError(null)
    setModal(true)
  }

  const save = async () => {
    if (!form.student || !form.date) { setError('Student and date are required.'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        student: Number(form.student),
        date: form.date,
        roll_call_time: form.roll_call_time,
        status: form.status,
        notes: form.notes.trim(),
      }
      if (editing) {
        await apiClient.put(`/hostel/attendance/${editing.id}/`, payload)
        setNotice('Attendance record updated.')
      } else {
        await apiClient.post('/hostel/attendance/', payload)
        setNotice('Attendance recorded.')
      }
      setModal(false)
      await load()
    } catch { setError('Unable to save attendance. A record for this student, date and roll call time may already exist.') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this attendance record?')) return
    try { await apiClient.delete(`/hostel/attendance/${id}/`); setNotice('Record deleted.'); await load() }
    catch { setError('Unable to delete attendance record.') }
  }

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const stats = {
    present: attendance.filter(a => a.status === 'Present').length,
    absent: attendance.filter(a => a.status === 'Absent').length,
    leave: attendance.filter(a => a.status === 'Leave').length,
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="HOSTEL"
        badgeColor="sky"
        title="Hostel Attendance"
        subtitle="Daily roll-call and night attendance records"
        icon="🏠"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Hostel Attendance</h1>
          <p className="mt-1 text-sm text-slate-400">Roll call records for Morning, Evening, and Night.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition duration-200">
          <ListChecks className="h-4 w-4" />
          Take Attendance
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.present}</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Present</div>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-rose-400">{stats.absent}</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Absent</div>
        </div>
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{stats.leave}</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">On Leave</div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="date"
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <select value={filterTime} onChange={e => setFilterTime(e.target.value)} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-sm text-slate-300 flex items-center gap-2">
          <option value="">All Roll Calls</option>
          {ROLL_CALL_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl glass-panel shadow-xl">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.025]">
              <th className="px-6 py-4 font-semibold text-slate-300">Student</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Date</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Roll Call</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Recorded By</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading attendance...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No attendance records found for this date.</td></tr>
            ) : filtered.map(record => (
              <tr key={record.id} className="group hover:bg-emerald-500/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-slate-600" />
                    <span className="font-semibold text-slate-200">{record.student_name || `Student #${record.student}`}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 font-mono text-xs">{record.date}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase text-emerald-400 font-bold tracking-wider">
                    <Clock className="h-3 w-3" />
                    {record.roll_call_time}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      record.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400' :
                      record.status === 'Absent' ? 'bg-rose-500/10 text-rose-400' : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      {record.status === 'Leave' ? 'On Leave' : record.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400">{record.recorded_by_name || 'System'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(record)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(record.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Attendance' : 'Record Attendance'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>}

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Student *</label>
              <select value={form.student} onChange={e => setF('student', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                <option value="">Select student</option>
                {students.map(s => <option key={s.id} value={s.id}>{`${s.first_name} ${s.last_name}`.trim()} ({s.admission_number})</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Date *</label>
              <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Roll Call Time</label>
                <select value={form.roll_call_time} onChange={e => setF('roll_call_time', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                  {ROLL_CALL_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setF('status', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Record'}
              </button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

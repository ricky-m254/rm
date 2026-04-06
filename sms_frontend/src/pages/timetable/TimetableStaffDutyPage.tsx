import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Employee = { id: number; first_name: string; last_name: string; employee_id: string }
type StaffDutySlot = {
  id: number; employee: number; employee_name: string; day_of_week: number
  duty_start: string; duty_end: string; location: string; description: string; is_active: boolean; notes: string
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

const days = [
  { id: 1, label: 'Monday' }, { id: 2, label: 'Tuesday' }, { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' }, { id: 5, label: 'Friday' },
]
const getDayLabel = (id: number) => days.find(d => d.id === id)?.label || 'Unknown'

export default function TimetableStaffDutyPage() {
  const [dutySlots, setDutySlots] = useState<StaffDutySlot[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dayFilter, setDayFilter] = useState<string>('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<StaffDutySlot | null>(null)
  const [empId, setEmpId] = useState<number | ''>('')
  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [dutyStart, setDutyStart] = useState('07:30')
  const [dutyEnd, setDutyEnd] = useState('08:00')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  const fetchDuties = async () => {
    setIsLoading(true)
    try {
      const [rd, re] = await Promise.all([
        apiClient.get<StaffDutySlot[] | { results: StaffDutySlot[] }>('/timetable/duty-slots/', { params: dayFilter ? { day_of_week: dayFilter } : {} }),
        apiClient.get<Employee[] | { results: Employee[] }>('/hr/employees/'),
      ])
      setDutySlots(asArray(rd.data)); setEmployees(asArray(re.data))
      setError(null)
    } catch { setError('Failed to load staff duty slots.') }
    finally { setIsLoading(false) }
  }

  useEffect(() => { void fetchDuties() }, [dayFilter])

  const openCreate = () => {
    setEditing(null); setEmpId(''); setDayOfWeek('1'); setDutyStart('07:30'); setDutyEnd('08:00'); setLocation(''); setDescription('')
    setModal(true)
  }

  const openEdit = (d: StaffDutySlot) => {
    setEditing(d); setEmpId(d.employee); setDayOfWeek(String(d.day_of_week)); setDutyStart(d.duty_start.substring(0,5)); setDutyEnd(d.duty_end.substring(0,5)); setLocation(d.location); setDescription(d.description)
    setModal(true)
  }

  const save = async () => {
    if (!empId || !location.trim()) return
    setError(null)
    try {
      const p = { employee: empId, day_of_week: Number(dayOfWeek), duty_start: dutyStart, duty_end: dutyEnd, location: location.trim(), description: description.trim(), is_active: true }
      if (editing) { await apiClient.put(`/timetable/duty-slots/${editing.id}/`, p); setNotice('Duty updated.') }
      else { await apiClient.post('/timetable/duty-slots/', p); setNotice('Duty added.') }
      setModal(false); await fetchDuties()
    } catch { setError('Unable to save duty slot.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this duty assignment?')) return
    try { await apiClient.delete(`/timetable/duty-slots/${id}/`); await fetchDuties() }
    catch { setError('Unable to delete duty.') }
  }

  const empLabel = (emp: Employee) => `${emp.first_name} ${emp.last_name}`.trim() || emp.employee_id

  return (
    <div className="space-y-6">
      <PageHero
        badge="TIMETABLE"
        badgeColor="violet"
        title="Staff Duty Rota"
        subtitle="Supervision, duty and extra-curricular rota"
        icon="📅"
      />
      <header className="rounded-2xl glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold text-emerald-400">Staff Duties</h1>
          <p className="mt-1 text-sm text-slate-400">Non-teaching staff duty assignments and locations.</p>
        </div>
        <button onClick={openCreate} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition">
          + Add Duty
        </button>
      </header>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <section className="rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="bg-slate-950 border border-white/[0.07] rounded-xl px-4 py-2 text-sm text-slate-200 min-w-[150px]"
          >
            <option value="">All Days</option>
            {days.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 animate-pulse">Loading duty roster...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Employee</th>
                  <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Day</th>
                  <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Location</th>
                  <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Time</th>
                  <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Description</th>
                  <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dutySlots.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500 italic">No duty assignments found.</td></tr>
                ) : (
                  dutySlots.map((duty) => (
                    <tr key={duty.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 border-b border-white/[0.07]"><p className="font-semibold text-slate-200">{duty.employee_name}</p></td>
                      <td className="p-4 border-b border-white/[0.07] text-slate-300 font-medium">{getDayLabel(duty.day_of_week)}</td>
                      <td className="p-4 border-b border-white/[0.07]">
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-500/20">{duty.location}</span>
                      </td>
                      <td className="p-4 border-b border-white/[0.07] text-slate-300 font-mono text-xs">
                        {duty.duty_start.substring(0,5)} - {duty.duty_end.substring(0,5)}
                      </td>
                      <td className="p-4 border-b border-white/[0.07] text-xs text-slate-400 max-w-[200px] truncate">{duty.description}</td>
                      <td className="p-4 border-b border-white/[0.07]">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(duty)} className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 transition">Edit</button>
                          <button onClick={() => del(duty.id)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-slate-950 p-6 space-y-3">
            <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Duty' : 'Add Duty'}</h2>
            <select value={empId} onChange={e => setEmpId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{empLabel(e)}</option>)}
            </select>
            <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              {days.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="time" value={dutyStart} onChange={e => setDutyStart(e.target.value)} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
              <input type="time" value={dutyEnd} onChange={e => setDutyEnd(e.target.value)} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
            </div>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location / Station" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description…" rows={2} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm resize-none" />
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">{editing ? 'Update' : 'Add'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

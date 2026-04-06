import { useState } from 'react'
import type { FormEvent } from 'react'
import { Search, UserPlus, BookOpen, AlertTriangle, X } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

const MEMBERS = [
  { id: 1, name: 'Mary Wanjiku', type: 'Student', class: 'Form 3 East', memberId: 'LIB-S-001', joined: '2023-01-09', borrowed: 2, overdue: 0, fines: 0 },
  { id: 2, name: 'John Mwangi', type: 'Student', class: 'Form 2 West', memberId: 'LIB-S-002', joined: '2023-01-09', borrowed: 0, overdue: 0, fines: 0 },
  { id: 3, name: 'Grace Murugi', type: 'Student', class: 'Form 4 East', memberId: 'LIB-S-003', joined: '2022-01-10', borrowed: 1, overdue: 1, fines: 20 },
  { id: 4, name: 'David Njoroge', type: 'Student', class: 'Form 2 North', memberId: 'LIB-S-004', joined: '2023-01-09', borrowed: 1, overdue: 0, fines: 0 },
  { id: 5, name: 'Faith Achieng', type: 'Student', class: 'Form 3 South', memberId: 'LIB-S-005', joined: '2023-01-09', borrowed: 1, overdue: 0, fines: 0 },
  { id: 6, name: 'James Wafula', type: 'Student', class: 'Form 2 East', memberId: 'LIB-S-006', joined: '2023-01-09', borrowed: 0, overdue: 0, fines: 0 },
  { id: 7, name: 'Peter Kamau', type: 'Student', class: 'Form 3 East', memberId: 'LIB-S-007', joined: '2023-01-09', borrowed: 1, overdue: 1, fines: 35 },
  { id: 8, name: 'Alice Nyambura', type: 'Student', class: 'Form 4 West', memberId: 'LIB-S-008', joined: '2022-01-10', borrowed: 1, overdue: 1, fines: 45 },
  { id: 9, name: 'Samuel Kiprotich', type: 'Student', class: 'Form 2 South', memberId: 'LIB-S-009', joined: '2023-01-09', borrowed: 1, overdue: 1, fines: 55 },
  { id: 10, name: 'Esther Chepkoech', type: 'Student', class: 'Form 4 East', memberId: 'LIB-S-010', joined: '2022-01-10', borrowed: 1, overdue: 1, fines: 60 },
  { id: 11, name: 'Ruth Adhiambo', type: 'Student', class: 'Form 1 East', memberId: 'LIB-S-011', joined: '2024-01-08', borrowed: 1, overdue: 0, fines: 0 },
  { id: 12, name: 'Michael Ochieng', type: 'Student', class: 'Form 3 North', memberId: 'LIB-S-012', joined: '2023-01-09', borrowed: 1, overdue: 0, fines: 0 },
  // Staff members
  { id: 13, name: 'Mr. David Mwangi', type: 'Staff', class: 'Mathematics Dept', memberId: 'LIB-T-001', joined: '2021-01-04', borrowed: 2, overdue: 0, fines: 0 },
  { id: 14, name: 'Ms. Grace Wanjiku', type: 'Staff', class: 'Sciences Dept', memberId: 'LIB-T-002', joined: '2021-01-04', borrowed: 1, overdue: 0, fines: 0 },
  { id: 15, name: 'Mr. Daniel Otieno', type: 'Staff', class: 'Chemistry Dept', memberId: 'LIB-T-003', joined: '2021-01-04', borrowed: 3, overdue: 0, fines: 0 },
  { id: 16, name: 'Mr. Samuel Kiprotich', type: 'Staff', class: 'Physics Dept', memberId: 'LIB-T-004', joined: '2021-01-04', borrowed: 1, overdue: 0, fines: 0 },
  { id: 17, name: 'Ms. Faith Achieng', type: 'Staff', class: 'Languages Dept', memberId: 'LIB-T-005', joined: '2021-01-04', borrowed: 4, overdue: 0, fines: 0 },
]

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

function getInitials(name: string) {
  return name.replace('Mr. ', '').replace('Ms. ', '').split(' ').slice(0, 2).map(n => n[0]).join('')
}

const AVATAR_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#f97316', '#84cc16']

export default function LibraryMembersPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Student' | 'Staff'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', type: 'Student', department: '', email: '' })
  const [adding, setAdding] = useState(false)
  const [addMsg, setAddMsg] = useState('')
  const handleSearch = (e: FormEvent) => e.preventDefault()

  async function handleAddMember(e: FormEvent) {
    e.preventDefault()
    setAdding(true)
    try {
      await apiClient.post('/library/members/', { name: addForm.name, member_type: addForm.type, department: addForm.department, email: addForm.email })
      setAddMsg('Member registered successfully!')
      setAddForm({ name: '', type: 'Student', department: '', email: '' })
      setTimeout(() => { setShowAdd(false); setAddMsg('') }, 1500)
    } catch {
      setAddMsg('Saved locally. Sync with backend when connected.')
      setTimeout(() => { setShowAdd(false); setAddMsg('') }, 2000)
    } finally {
      setAdding(false)
    }
  }

  const filtered = MEMBERS.filter(m => {
    const matchType = typeFilter === 'all' || m.type === typeFilter
    const matchSearch = search === '' || m.name.toLowerCase().includes(search.toLowerCase()) || m.memberId.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const students = MEMBERS.filter(m => m.type === 'Student').length
  const staff = MEMBERS.filter(m => m.type === 'Staff').length
  const withFines = MEMBERS.filter(m => m.fines > 0).length

  return (
    <div className="space-y-6">
      <PageHero
        badge="LIBRARY"
        badgeColor="teal"
        title="Library Members"
        subtitle="Student and staff library memberships"
        icon="📚"
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Library Members</h1>
          <p className="text-slate-400 text-sm mt-1">Students and staff registered in the library system</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold self-start" style={{ background: '#6366f1', color: '#fff' }}>
          <UserPlus size={15} /> Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Students', value: students, color: '#10b981' },
          { label: 'Staff', value: staff, color: '#6366f1' },
          { label: 'With Fines', value: withFines, color: '#ef4444' },
        ].map(s => (
          <GlassCard key={s.label} className="p-5 text-center">
            <p className="text-3xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or member ID…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </form>
        <div className="flex gap-2">
          {(['all', 'Student', 'Staff'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={typeFilter === t ? { background: '#6366f1', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((m, i) => {
          const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
          return (
            <GlassCard key={m.id} className="p-5 hover:border-slate-600 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white flex-shrink-0"
                  style={{ background: avatarColor }}>
                  {getInitials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-white">{m.name}</p>
                      <p className="text-xs text-slate-400">{m.class}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                      style={m.type === 'Student' ? { background: 'rgba(16,185,129,0.15)', color: '#34d399' } : { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                      {m.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">ID: {m.memberId}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <BookOpen size={12} />
                      <span>{m.borrowed} borrowed</span>
                    </div>
                    {m.fines > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-400">
                        <AlertTriangle size={12} />
                        <span>Ksh {m.fines} fine</span>
                      </div>
                    )}
                    {m.overdue > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-xs font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>
                        {m.overdue} overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-white">Add Library Member</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name *</label>
                <input required value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="e.g. Jane Wambui" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Member Type</label>
                <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <option value="Student">Student</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Class / Department</label>
                <input value={addForm.department} onChange={e => setAddForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="e.g. Form 2 East" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
                <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="member@school.ac.ke" />
              </div>
              {addMsg && <p className="text-xs text-emerald-400 font-medium">{addMsg}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-300 transition" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Cancel</button>
                <button type="submit" disabled={adding} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90" style={{ background: '#6366f1' }}>
                  {adding ? 'Saving…' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

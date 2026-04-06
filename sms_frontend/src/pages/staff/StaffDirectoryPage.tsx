import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '../../api/client'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'
import {
  Search, Download, Plus, X, Users, GraduationCap, Wrench,
  Shield, ChefHat, Car, Stethoscope, Monitor, BookOpen,
} from 'lucide-react'

type Staff = {
  id: number
  staff_id: string
  full_name: string
  staff_type: string
  employment_type: string
  status: string
  email_work: string
  phone_primary: string
  role?: string
}

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

const defaultForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  staff_type: 'Teaching',
  employment_type: 'Full-time',
  status: 'Active',
  email_work: '',
  phone_primary: '',
  join_date: '',
}

const NON_TEACHING_ROLES = [
  'Principal', 'Deputy Principal', 'Senior Clerk', 'Bursar', 'Accounts Assistant',
  'School Secretary', 'Lab Technician', 'Librarian', 'Driver', 'Security Guard',
  'Head Cook', 'Kitchen Staff', 'Groundskeeper', 'Nurse', 'ICT Technician',
  'Matron', 'Cleaner', 'Watchman', 'Caretaker',
]

const ROLE_ICON: Record<string, React.ElementType> = {
  'Teacher': GraduationCap,
  'Principal': Shield, 'Deputy Principal': Shield,
  'Driver': Car, 'Security Guard': Shield, 'Nurse': Stethoscope,
  'ICT Technician': Monitor, 'Lab Technician': Wrench,
  'Librarian': BookOpen, 'Head Cook': ChefHat, 'Kitchen Staff': ChefHat,
}

const TAB_CONFIG = [
  { key: 'all',     label: 'All Staff',        color: '#94a3b8' },
  { key: 'teaching',label: 'Teaching',         color: '#10b981' },
  { key: 'non',     label: 'Non-Teaching',     color: '#a78bfa' },
  { key: 'admin',   label: 'Administration',   color: '#38bdf8' },
  { key: 'support', label: 'Support Staff',    color: '#f59e0b' },
]

const ADMIN_ROLES = ['Principal', 'Deputy Principal', 'Senior Clerk', 'Bursar', 'Accounts Assistant', 'School Secretary']
const SUPPORT_ROLES = ['Driver', 'Security Guard', 'Head Cook', 'Kitchen Staff', 'Groundskeeper', 'Nurse', 'ICT Technician', 'Matron', 'Lab Technician', 'Librarian', 'Cleaner', 'Watchman', 'Caretaker']

function getStaffCategory(s: Staff): string {
  const type = (s.staff_type || '').toLowerCase()
  const role = (s.role || s.full_name || '')
  if (type === 'teaching' || type === 'teacher') return 'teaching'
  if (ADMIN_ROLES.some(r => role.includes(r))) return 'admin'
  if (SUPPORT_ROLES.some(r => role.includes(r))) return 'support'
  if (NON_TEACHING_ROLES.some(r => role.includes(r))) return 'non'
  if (type === 'non-teaching' || type === 'nonteaching') return 'non'
  return 'non'
}

export default function StaffDirectoryPage() {
  const [rows, setRows] = useState<Staff[]>([])
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    setError(null)
    try {
      if (query.trim()) {
        const res = await apiClient.get<Staff[] | { results: Staff[] }>(`/staff/search/?q=${encodeURIComponent(query.trim())}`)
        setRows(asArray(res.data))
      } else {
        const res = await apiClient.get<Staff[] | { results: Staff[] }>('/staff/')
        setRows(asArray(res.data))
      }
    } catch {
      setError('Unable to load staff directory.')
    }
  }

  useEffect(() => { void load() }, [query])

  const filtered = useMemo(() => {
    if (tab === 'all') return rows
    return rows.filter(r => getStaffCategory(r) === tab)
  }, [rows, tab])

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, teaching: 0, non: 0, admin: 0, support: 0 }
    rows.forEach(r => { c[getStaffCategory(r)] = (c[getStaffCategory(r)] || 0) + 1 })
    return c
  }, [rows])

  const createStaff = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.'); return
    }
    setWorking(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/staff/', form)
      setForm(defaultForm); setNotice('Staff member created.'); setShowCreate(false)
      await load()
    } catch {
      setError('Unable to create staff member.')
    } finally { setWorking(false) }
  }

  const exportCsv = async () => {
    try {
      const res = await apiClient.get('/staff/export/', { responseType: 'blob' })
      downloadFromResponse(res as { data: Blob; headers?: Record<string, unknown> }, 'staff_directory.csv')
    } catch (err) { setError(extractApiErrorMessage(err, 'Unable to export.')) }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHero
        badge="STAFF"
        badgeColor="blue"
        title="Staff Directory"
        subtitle="All teaching and non-teaching staff"
        icon="👤"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Staff Directory</h1>
          <p className="text-slate-400 text-sm mt-0.5">{rows.length} staff members · Teaching & Non-Teaching</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Download size={13} /> Export
          </button>
          <button onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition hover:opacity-90"
            style={{ background: showCreate ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: showCreate ? '#f87171' : '#10b981', border: `1px solid ${showCreate ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
            {showCreate ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Staff</>}
          </button>
        </div>
      </div>

      {error  && <div className="rounded-2xl p-4 text-sm text-rose-200 flex items-center gap-2"   style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><X size={13} className="text-rose-400" />{error}</div>}
      {notice && <div className="rounded-2xl p-4 text-sm text-emerald-200 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>{notice}</div>}

      {/* Search bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search name, ID, email, phone..."
          className="w-full rounded-2xl pl-9 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-emerald-500/50 transition"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        />
      </div>

      {/* Role tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TAB_CONFIG.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
            style={tab === t.key
              ? { background: `${t.color}20`, color: t.color, boxShadow: `0 0 0 1px ${t.color}50` }
              : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {t.label}
            <span className="rounded-full px-1.5 py-0.5 text-[10px]"
              style={{ background: tab === t.key ? `${t.color}25` : 'rgba(255,255,255,0.06)' }}>
              {tabCounts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className={`grid gap-6 ${showCreate ? 'xl:grid-cols-3' : 'grid-cols-1'}`}>

        {/* Staff Table */}
        <div className={`rounded-2xl overflow-hidden ${showCreate ? 'xl:col-span-2' : ''}`}
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['ID', 'Name', 'Role / Type', 'Employment', 'Status', 'Contact'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center">
                    <Users size={28} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">No staff members found</p>
                  </td></tr>
                ) : filtered.map(row => {
                  const cat = getStaffCategory(row)
                  const tabCfg = TAB_CONFIG.find(t => t.key === cat)
                  const RoleIcon = ROLE_ICON[row.staff_type] ?? Users
                  return (
                    <tr key={row.id} className="group hover:bg-white/[0.02] transition"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 text-xs font-mono text-slate-400">{row.staff_id || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                            style={{ background: tabCfg ? `${tabCfg.color}30` : 'rgba(255,255,255,0.1)' }}>
                            {row.full_name?.charAt(0) ?? '?'}
                          </div>
                          <span className="text-sm text-slate-200 font-medium">{row.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <RoleIcon size={11} style={{ color: tabCfg?.color ?? '#94a3b8' }} />
                          <span className="text-xs text-slate-300">{row.staff_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">{row.employment_type || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            background: row.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)',
                            color: row.status === 'Active' ? '#34d399' : '#9ca3af',
                          }}>
                          {row.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{row.phone_primary || row.email_work || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <h2 className="text-sm font-bold text-white flex items-center gap-2"><Plus size={13} className="text-emerald-400" />Add Staff Member</h2>
            {(
              [
                ['first_name', 'First name *'],
                ['middle_name', 'Middle name'],
                ['last_name', 'Last name *'],
                ['email_work', 'Work email'],
                ['phone_primary', 'Phone'],
              ] as [keyof typeof form, string][]
            ).map(([field, label]) => (
              <input key={field} value={form[field]} placeholder={label}
                onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition focus:ring-1 focus:ring-emerald-500/40"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }} />
            ))}
            <select value={form.staff_type} onChange={e => setForm(p => ({ ...p, staff_type: e.target.value }))}
              className="w-full rounded-xl px-3 py-2 text-sm text-slate-200 outline-none transition"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <option value="Teaching">Teaching</option>
              <option value="Non-Teaching">Non-Teaching</option>
              <option value="Administration">Administration</option>
              <option value="Support">Support</option>
            </select>
            <select value={form.employment_type} onChange={e => setForm(p => ({ ...p, employment_type: e.target.value }))}
              className="w-full rounded-xl px-3 py-2 text-sm text-slate-200 outline-none transition"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="TSC">TSC Deployed</option>
              <option value="BOM">BOM Employed</option>
            </select>
            <input type="date" value={form.join_date} onChange={e => setForm(p => ({ ...p, join_date: e.target.value }))}
              className="w-full rounded-xl px-3 py-2 text-sm text-slate-400 outline-none transition"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }} />
            <button onClick={createStaff} disabled={working}
              className="w-full rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.3), rgba(16,185,129,0.15))', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              {working ? 'Saving…' : 'Create Staff Member'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

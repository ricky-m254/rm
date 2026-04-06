import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import {
  Search, BookOpen, Building2, DollarSign, GraduationCap,
  Users, Trophy, MessageSquare, BarChart3, UserCheck,
  LayoutDashboard, CalendarDays, X, ArrowRight, Loader2,
  Shield, HeartPulse, Bus, Home, BookMarked, Monitor,
  FileText, FlaskConical, ClipboardList,
} from 'lucide-react'

interface PaletteItem {
  id: string
  label: string
  subtitle?: string
  route: string
  icon: React.ElementType
  color: string
  category: string
  keywords?: string[]
}

interface StudentResult {
  id: number
  admission_number: string
  first_name: string
  last_name: string
  current_class?: string
}

const ALL_PAGES: PaletteItem[] = [
  // ── Dashboard ──────────────────────────────────────────
  { id: 'dashboard', label: 'Dashboard', subtitle: 'School command centre', route: '/dashboard', icon: LayoutDashboard, color: '#10b981', category: 'Core' },
  { id: 'approvals', label: 'Approvals', subtitle: 'Pending approval requests', route: '/dashboard/approvals', icon: ClipboardList, color: '#fbbf24', category: 'Core' },

  // ── Students ──────────────────────────────────────────
  { id: 'students', label: 'Student Directory', subtitle: 'All enrolled students', route: '/modules/students', icon: Users, color: '#38bdf8', category: 'Students', keywords: ['directory', 'pupils', 'learners'] },
  { id: 'admissions', label: 'Admissions', subtitle: 'Student applications & enrolment', route: '/modules/admissions/dashboard', icon: GraduationCap, color: '#10b981', category: 'Students' },
  { id: 'alumni', label: 'Alumni', subtitle: 'Graduate profiles & engagement', route: '/modules/alumni/dashboard', icon: GraduationCap, color: '#fbbf24', category: 'Students' },
  { id: 'parent-portal', label: 'Parent Portal', subtitle: 'Guardian-facing dashboard', route: '/modules/parent-portal/dashboard', icon: Users, color: '#a78bfa', category: 'Students' },

  // ── Academics ─────────────────────────────────────────
  { id: 'academics', label: 'Academics Dashboard', subtitle: 'Classes, grading, attendance', route: '/modules/academics/dashboard', icon: BookOpen, color: '#818cf8', category: 'Academics' },
  { id: 'gradebook', label: 'Gradebook', subtitle: 'Assessments & marks entry', route: '/modules/academics/gradebook', icon: ClipboardList, color: '#818cf8', category: 'Academics', keywords: ['marks', 'grades', 'scores'] },
  { id: 'report-cards', label: 'Report Cards', subtitle: 'CBC-aligned student reports', route: '/modules/academics/report-cards', icon: FileText, color: '#818cf8', category: 'Academics', keywords: ['reports', 'progress', 'cbc'] },
  { id: 'subjects', label: 'Subjects', subtitle: 'Curriculum subjects & codes', route: '/modules/academics/subjects', icon: BookOpen, color: '#818cf8', category: 'Academics' },
  { id: 'classes', label: 'Class Management', subtitle: 'Forms, streams & sections', route: '/modules/academics/classes', icon: Users, color: '#818cf8', category: 'Academics' },
  { id: 'curriculum', label: 'Curriculum', subtitle: 'Schemes of work & lessons', route: '/modules/curriculum/dashboard', icon: BookMarked, color: '#6366f1', category: 'Academics' },
  { id: 'timetable', label: 'Timetable', subtitle: 'Visual weekly timetable grid', route: '/modules/timetable/grid', icon: CalendarDays, color: '#38bdf8', category: 'Academics', keywords: ['schedule', 'periods', 'grid'] },
  { id: 'examinations', label: 'Examinations', subtitle: 'Exam scheduling & results', route: '/modules/examinations', icon: FlaskConical, color: '#f472b6', category: 'Academics', keywords: ['exams', 'kcse', 'results'] },
  { id: 'elearning', label: 'E-Learning', subtitle: 'CBC videos, ebooks, past papers', route: '/modules/elearning/dashboard', icon: Monitor, color: '#22d3ee', category: 'Academics', keywords: ['online', 'videos', 'cbc', 'knec'] },
  { id: 'ptm', label: 'Parent-Teacher Meetings', subtitle: 'Schedule & track PTM sessions', route: '/modules/ptm/dashboard', icon: MessageSquare, color: '#fb923c', category: 'Academics' },

  // ── Finance ───────────────────────────────────────────
  { id: 'finance', label: 'Finance Summary', subtitle: 'IPSAS-compliant finance overview', route: '/modules/finance', icon: DollarSign, color: '#10b981', category: 'Finance', keywords: ['fees', 'money', 'budget', 'ipsas'] },
  { id: 'invoices', label: 'Invoices', subtitle: 'Student fee invoices', route: '/modules/finance/invoices', icon: FileText, color: '#10b981', category: 'Finance', keywords: ['bills', 'fees'] },
  { id: 'payments', label: 'Payments', subtitle: 'Record & track fee payments', route: '/modules/finance/payments', icon: DollarSign, color: '#10b981', category: 'Finance', keywords: ['receipts', 'collections'] },
  { id: 'expenses', label: 'Expenses', subtitle: 'School expenditure tracking', route: '/modules/finance/expenses', icon: DollarSign, color: '#f97316', category: 'Finance', keywords: ['expenditure', 'spending'] },
  { id: 'fee-structures', label: 'Fee Structures', subtitle: 'Tuition & other fee definitions', route: '/modules/finance/fees', icon: ClipboardList, color: '#10b981', category: 'Finance' },

  // ── Operations ────────────────────────────────────────
  { id: 'library', label: 'Library', subtitle: 'Catalog, circulation & members', route: '/modules/library/dashboard', icon: BookOpen, color: '#a78bfa', category: 'Operations', keywords: ['books', 'catalog', 'borrow'] },
  { id: 'transport', label: 'Transport', subtitle: 'Vehicles, routes & students', route: '/modules/transport/dashboard', icon: Bus, color: '#38bdf8', category: 'Operations', keywords: ['bus', 'route', 'vehicle'] },
  { id: 'hostel', label: 'Hostel / Boarding', subtitle: 'Dormitories & bed allocations', route: '/modules/hostel/dashboard', icon: Home, color: '#60a5fa', category: 'Operations', keywords: ['boarding', 'dorm', 'bed'] },
  { id: 'dispensary', label: 'Dispensary', subtitle: 'Health records & medication', route: '/modules/dispensary', icon: HeartPulse, color: '#f43f5e', category: 'Operations', keywords: ['health', 'medical', 'nurse'] },
  { id: 'maintenance', label: 'Maintenance', subtitle: 'Facility & equipment requests', route: '/modules/maintenance/dashboard', icon: Building2, color: '#f97316', category: 'Operations' },
  { id: 'visitors', label: 'Visitor Management', subtitle: 'Visitor sign-in & records', route: '/modules/visitors/dashboard', icon: UserCheck, color: '#2dd4bf', category: 'Operations' },
  { id: 'assets', label: 'Assets', subtitle: 'Asset registry & depreciation', route: '/modules/assets/dashboard', icon: Shield, color: '#f59e0b', category: 'Operations' },

  // ── Staff & HR ────────────────────────────────────────
  { id: 'staff', label: 'Staff Directory', subtitle: 'All employees & roles', route: '/modules/staff/dashboard', icon: UserCheck, color: '#fbbf24', category: 'Staff & HR', keywords: ['employees', 'teachers', 'workers'] },
  { id: 'hr', label: 'HR & Payroll', subtitle: 'Payroll, leave & contracts', route: '/modules/hr/dashboard', icon: Users, color: '#fbbf24', category: 'Staff & HR', keywords: ['payroll', 'salary', 'leave'] },
  { id: 'clockin', label: 'Clock In / Out', subtitle: 'Staff attendance & time logs', route: '/modules/clockin/dashboard', icon: CalendarDays, color: '#fbbf24', category: 'Staff & HR' },

  // ── Student Life ──────────────────────────────────────
  { id: 'sports', label: 'Sports & Clubs', subtitle: 'Teams, tournaments & awards', route: '/modules/sports/dashboard', icon: Trophy, color: '#f97316', category: 'Student Life', keywords: ['clubs', 'teams', 'games'] },
  { id: 'cafeteria', label: 'Cafeteria', subtitle: 'Menu plans & meal logs', route: '/modules/cafeteria/dashboard', icon: Building2, color: '#14b8a6', category: 'Student Life', keywords: ['food', 'meals', 'lunch'] },

  // ── Communication ─────────────────────────────────────
  { id: 'communication', label: 'Communication', subtitle: 'Announcements, conversations, SMS & email', route: '/modules/communication/dashboard', icon: MessageSquare, color: '#f9a8d4', category: 'Communication', keywords: ['announcements', 'conversations', 'sms', 'email', 'messages'] },

  // ── Analytics ─────────────────────────────────────────
  { id: 'analytics', label: 'Analytics', subtitle: 'KPIs, charts & at-risk reports', route: '/modules/analytics/dashboard', icon: BarChart3, color: '#22d3ee', category: 'Analytics', keywords: ['reports', 'insights', 'data'] },
  { id: 'reporting', label: 'Audit Logs', subtitle: 'Read-only reporting audit trail', route: '/modules/reporting/audit-logs', icon: FileText, color: '#60a5fa', category: 'Analytics', keywords: ['reporting', 'audit', 'logs', 'history'] },
]

const CATEGORY_ORDER = ['Core', 'Students', 'Academics', 'Finance', 'Operations', 'Staff & HR', 'Student Life', 'Communication', 'Analytics']

const COLOR_MAP: Record<string, string> = {
  'Core': '#fbbf24', 'Students': '#38bdf8', 'Academics': '#818cf8',
  'Finance': '#10b981', 'Operations': '#60a5fa', 'Staff & HR': '#fbbf24',
  'Student Life': '#f97316', 'Communication': '#f9a8d4', 'Analytics': '#22d3ee',
}

function match(item: PaletteItem, q: string): boolean {
  const lower = q.toLowerCase()
  if (item.label.toLowerCase().includes(lower)) return true
  if (item.subtitle?.toLowerCase().includes(lower)) return true
  if (item.category.toLowerCase().includes(lower)) return true
  if (item.keywords?.some(k => k.includes(lower))) return true
  return false
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [students, setStudents] = useState<StudentResult[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setCursor(0)
      setStudents([])
    }
  }, [open])

  // Student search with debounce
  useEffect(() => {
    if (query.length < 2) { setStudents([]); return }
    setLoadingStudents(true)
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get('/students/', { params: { search: query, limit: 5 } })
        const data = res.data
        const list: StudentResult[] = Array.isArray(data) ? data : (data.results ?? [])
        setStudents(list.slice(0, 5))
      } catch { setStudents([]) }
      finally { setLoadingStudents(false) }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  // Filter pages
  const filtered = query.length === 0
    ? ALL_PAGES.slice(0, 8)
    : ALL_PAGES.filter(p => match(p, query))

  // Build flat result list for keyboard nav
  const flatResults: Array<{ type: 'page'; item: PaletteItem } | { type: 'student'; student: StudentResult }> = [
    ...filtered.map(item => ({ type: 'page' as const, item })),
    ...students.map(s => ({ type: 'student' as const, student: s })),
  ]

  const go = useCallback((route: string) => {
    navigate(route)
    onClose()
  }, [navigate, onClose])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCursor(c => Math.min(c + 1, flatResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCursor(c => Math.max(c - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const sel = flatResults[cursor]
        if (!sel) return
        if (sel.type === 'page') go(sel.item.route)
        else go(`/modules/students?search=${sel.student.admission_number}`)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, cursor, flatResults, go, onClose])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  const grouped = CATEGORY_ORDER.reduce<Record<string, PaletteItem[]>>((acc, cat) => {
    const items = filtered.filter(p => p.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(7,11,18,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(15,22,36,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
          maxHeight: '68vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search size={16} className="flex-shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            placeholder="Search modules, students, pages…"
            className="flex-1 bg-transparent text-[14px] text-white placeholder-slate-500 outline-none"
          />
          {loadingStudents && <Loader2 size={13} className="text-slate-500 animate-spin flex-shrink-0" />}
          <button onClick={onClose} className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition">
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin' }}>
          {query.length === 0 && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Quick Access</p>
            </div>
          )}

          {/* Page results — grouped */}
          {Object.keys(grouped).length > 0 && Object.entries(grouped).map(([cat, items]) => {
            const catColor = COLOR_MAP[cat] ?? '#64748b'
            return (
              <div key={cat}>
                {query.length > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: catColor }}>{cat}</span>
                  </div>
                )}
                {items.map(item => {
                  const idx = flatResults.findIndex(r => r.type === 'page' && r.item.id === item.id)
                  const isActive = cursor === idx
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      onClick={() => go(item.route)}
                      onMouseEnter={() => setCursor(idx)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                        borderLeft: isActive ? `2px solid ${item.color}` : '2px solid transparent',
                      }}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}>
                        <Icon size={14} style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white truncate">{item.label}</p>
                        {item.subtitle && (
                          <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                        )}
                      </div>
                      {isActive && <ArrowRight size={13} className="flex-shrink-0 text-slate-500" />}
                    </button>
                  )
                })}
              </div>
            )
          })}

          {/* Student results */}
          {students.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-sky-500">Students</span>
              </div>
              {students.map(s => {
                const idx = flatResults.findIndex(r => r.type === 'student' && r.student.id === s.id)
                const isActive = cursor === idx
                return (
                  <button
                    key={s.id}
                    data-idx={idx}
                    onClick={() => go(`/modules/students?search=${s.admission_number}`)}
                    onMouseEnter={() => setCursor(idx)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                      borderLeft: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                    }}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-sky-500/15 border border-sky-500/25">
                      <span className="text-[11px] font-bold text-sky-300">
                        {s.first_name[0]}{s.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{s.first_name} {s.last_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {s.admission_number}{s.current_class ? ` · ${s.current_class}` : ''}
                      </p>
                    </div>
                    {isActive && <ArrowRight size={13} className="flex-shrink-0 text-slate-500" />}
                  </button>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && students.length === 0 && query.length > 0 && !loadingStudents && (
            <div className="flex flex-col items-center py-10 px-4">
              <Search size={28} className="text-slate-700 mb-3" />
              <p className="text-[13px] text-slate-500">No results for "<span className="text-slate-400">{query}</span>"</p>
            </div>
          )}

          {/* Bottom spacing */}
          <div className="h-2" />
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
          {[
            { keys: ['↑', '↓'], label: 'navigate' },
            { keys: ['↵'], label: 'open' },
            { keys: ['Esc'], label: 'close' },
          ].map(h => (
            <div key={h.label} className="flex items-center gap-1.5">
              {h.keys.map(k => (
                <kbd key={k} className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {k}
                </kbd>
              ))}
              <span className="text-[10px] text-slate-600">{h.label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              ⌘K
            </kbd>
            <span className="text-[10px] text-slate-600">toggle</span>
          </div>
        </div>
      </div>
    </div>
  )
}

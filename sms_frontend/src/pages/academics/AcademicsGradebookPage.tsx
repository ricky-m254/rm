import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import PageHero from '../../components/PageHero'
import {
  BookOpen, Layers, ClipboardList, BarChart3,
  CheckCircle2, AlertTriangle, Plus,
} from 'lucide-react'

type GradingScheme = { id: number; name: string; is_default: boolean; is_active: boolean }
type GradeBand = { id: number; scheme: number; scheme_name?: string; label: string; min_score: string; max_score: string; grade_point?: string | null; remark?: string }
type Assessment = { id: number; name: string; category: string; subject: number; subject_name?: string; class_section: number; class_section_name?: string; term: number; term_name?: string; max_score: string; weight_percent: string; date: string; is_published: boolean }
type Grade = { id: number; assessment: number; student: number; student_name?: string; raw_score: string; percentage: string; grade_band_label?: string }
type TermResult = { id: number; student_name?: string; class_section_name?: string; term_name?: string; subject_name?: string; total_score: string; grade_band_label?: string; class_rank?: number | null; is_pass: boolean }
type Student = { id: number; first_name: string; last_name: string; admission_number: string }
type Subject = { id: number; name: string; code: string }
type SchoolClass = { id: number; display_name?: string; name: string }
type Term = { id: number; name: string }

function errMsg(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (!data) return 'Request failed.'
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const msgs: string[] = []
    Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
      if (Array.isArray(v)) msgs.push(`${k}: ${v.join(' ')}`)
      else if (typeof v === 'string') msgs.push(`${k}: ${v}`)
    })
    if (msgs.length) return msgs.join(' | ')
  }
  return 'Request failed.'
}

const gradeColor = (pct: number) => {
  if (pct >= 75) return '#10b981'
  if (pct >= 60) return '#38bdf8'
  if (pct >= 50) return '#fbbf24'
  if (pct >= 40) return '#f97316'
  return '#f87171'
}

const TABS = [
  { id: 'schemes',     label: 'Schemes & Bands', icon: Layers },
  { id: 'assessments', label: 'Assessments',      icon: BookOpen },
  { id: 'marks',       label: 'Mark Entry',       icon: ClipboardList },
  { id: 'results',     label: 'Term Results',     icon: BarChart3 },
] as const
type Tab = typeof TABS[number]['id']

const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:ring-1 focus:ring-emerald-500/40'
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as const

export default function AcademicsGradebookPage() {
  const [tab, setTab] = useState<Tab>('assessments')
  const [schemes, setSchemes] = useState<GradingScheme[]>([])
  const [bands, setBands] = useState<GradeBand[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [results, setResults] = useState<TermResult[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Forms
  const [schemeForm, setSchemeForm] = useState({ name: '', is_default: false, is_active: true })
  const [bandForm, setBandForm] = useState({ scheme: '', label: '', min_score: '0', max_score: '100', grade_point: '', remark: '' })
  const [assessmentForm, setAssessmentForm] = useState({ name: '', category: 'Test', subject: '', class_section: '', term: '', max_score: '100', weight_percent: '100', date: '', is_active: true })
  const [selAssessment, setSelAssessment] = useState('')
  const [selClassCompute, setSelClassCompute] = useState('')
  const [selTermCompute, setSelTermCompute] = useState('')
  const [selSchemeCompute, setSelSchemeCompute] = useState('')
  const [gradeRows, setGradeRows] = useState<Record<number, string>>({})

  const loadAll = async () => {
    setIsLoading(true); setError(null)
    try {
      const [sR, bR, aR, gR, rR, stR, subR, clR, tR] = await Promise.all([
        apiClient.get('/academics/grading-schemes/'),
        apiClient.get('/academics/grade-bands/'),
        apiClient.get('/academics/assessments/'),
        apiClient.get('/academics/grades/'),
        apiClient.get('/academics/term-results/'),
        apiClient.get('/students/'),
        apiClient.get('/academics/subjects/'),
        apiClient.get('/academics/classes/'),
        apiClient.get('/academics/ref/terms/'),
      ])
      setSchemes(normalizePaginatedResponse<GradingScheme>(sR.data).items)
      setBands(normalizePaginatedResponse<GradeBand>(bR.data).items)
      setAssessments(normalizePaginatedResponse<Assessment>(aR.data).items)
      setGrades(normalizePaginatedResponse<Grade>(gR.data).items)
      setResults(normalizePaginatedResponse<TermResult>(rR.data).items)
      setStudents(normalizePaginatedResponse<Student>(stR.data).items)
      setSubjects(normalizePaginatedResponse<Subject>(subR.data).items)
      setClasses(normalizePaginatedResponse<SchoolClass>(clR.data).items)
      setTerms(normalizePaginatedResponse<Term>(tR.data).items)
    } catch (err) { setError(errMsg(err)) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { void loadAll() }, [])

  const currentAssessment = useMemo(() => assessments.find(a => String(a.id) === String(selAssessment)), [assessments, selAssessment])

  const submitScheme = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setFlash(null)
    try { await apiClient.post('/academics/grading-schemes/', schemeForm); setSchemeForm({ name: '', is_default: false, is_active: true }); setFlash('Grading scheme created.'); await loadAll() }
    catch (err) { setError(errMsg(err)) }
  }

  const submitBand = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setFlash(null)
    try {
      await apiClient.post('/academics/grade-bands/', { scheme: Number(bandForm.scheme), label: bandForm.label, min_score: Number(bandForm.min_score), max_score: Number(bandForm.max_score), grade_point: bandForm.grade_point ? Number(bandForm.grade_point) : null, remark: bandForm.remark, is_active: true })
      setBandForm({ scheme: '', label: '', min_score: '0', max_score: '100', grade_point: '', remark: '' }); setFlash('Grade band created.'); await loadAll()
    } catch (err) { setError(errMsg(err)) }
  }

  const submitAssessment = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setFlash(null)
    try {
      await apiClient.post('/academics/assessments/', { ...assessmentForm, subject: Number(assessmentForm.subject), class_section: Number(assessmentForm.class_section), term: Number(assessmentForm.term), max_score: Number(assessmentForm.max_score), weight_percent: Number(assessmentForm.weight_percent) })
      setAssessmentForm({ name: '', category: 'Test', subject: '', class_section: '', term: '', max_score: '100', weight_percent: '100', date: '', is_active: true }); setFlash('Assessment created.'); await loadAll()
    } catch (err) { setError(errMsg(err)) }
  }

  const publishAssessment = async (id: number) => {
    setError(null); setFlash(null)
    try { await apiClient.post(`/academics/assessments/${id}/publish/`, {}); setFlash('Assessment published.'); await loadAll() }
    catch (err) { setError(errMsg(err)) }
  }

  const submitBulkGrades = async () => {
    if (!currentAssessment) return
    setError(null); setFlash(null)
    const rows = Object.entries(gradeRows).filter(([, s]) => s !== '').map(([sid, score]) => ({ student: Number(sid), raw_score: Number(score), remarks: '' }))
    if (!rows.length) { setError('Enter at least one score.'); return }
    try {
      await apiClient.post('/academics/grades/bulk/', { assessment: currentAssessment.id, grades: rows })
      setFlash('Bulk grades saved.'); await loadAll()
    } catch (err) { setError(errMsg(err)) }
  }

  const computeResults = async () => {
    if (!selClassCompute || !selTermCompute) return
    setError(null); setFlash(null)
    try {
      const payload: Record<string, number> = { class_section: Number(selClassCompute), term: Number(selTermCompute) }
      if (selSchemeCompute) payload.grading_scheme = Number(selSchemeCompute)
      await apiClient.post('/academics/term-results/compute/', payload); setFlash('Term results computed.'); await loadAll()
    } catch (err) { setError(errMsg(err)) }
  }

  return (
    <div className="p-6 space-y-5">
      <PageHero
        badge="ACADEMICS"
        badgeColor="emerald"
        title="Gradebook"
        subtitle="Record and manage student marks and grades"
        icon="📖"
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Gradebook</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage grading schemes, assessments, mark entry and term results</p>
      </div>

      {/* Alerts */}
      {error && <div className="rounded-2xl p-4 text-sm text-rose-200 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><AlertTriangle size={13} className="text-rose-400 flex-shrink-0" />{error}</div>}
      {flash && <div className="rounded-2xl p-4 text-sm text-emerald-200 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}><CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />{flash}</div>}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition"
            style={tab === t.id ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' } : { color: '#64748b' }}>
            <t.icon size={11} /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Schemes & Bands ── */}
      {tab === 'schemes' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2"><Layers size={13} className="text-violet-400" /> Grading Schemes</p>
            <form onSubmit={submitScheme} className="space-y-3">
              <input className={inputCls} style={inputStyle} placeholder="Scheme name (e.g. KNEC 2025)" value={schemeForm.name} onChange={e => setSchemeForm(p => ({ ...p, name: e.target.value }))} required />
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer"><input type="checkbox" checked={schemeForm.is_default} onChange={e => setSchemeForm(p => ({ ...p, is_default: e.target.checked }))} className="rounded" /> Set as default</label>
              <button type="submit" className="w-full rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90 flex items-center justify-center gap-2" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}><Plus size={13} /> Create Scheme</button>
            </form>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {schemes.length === 0 ? <p className="text-xs text-slate-600 py-3">No schemes yet.</p> : schemes.map(s => (
                <div key={s.id} className="py-2.5 flex items-center justify-between">
                  <p className="text-sm text-slate-300">{s.name}</p>
                  {s.is_default && <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Default</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2"><Layers size={13} className="text-amber-400" /> Grade Bands</p>
            <form onSubmit={submitBand} className="space-y-3">
              <select className={inputCls} style={inputStyle} value={bandForm.scheme} onChange={e => setBandForm(p => ({ ...p, scheme: e.target.value }))} required>
                <option value="">Select scheme</option>{schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input className={inputCls} style={inputStyle} placeholder="Label (A)" value={bandForm.label} onChange={e => setBandForm(p => ({ ...p, label: e.target.value }))} required />
                <input type="number" className={inputCls} style={inputStyle} placeholder="Min %" value={bandForm.min_score} onChange={e => setBandForm(p => ({ ...p, min_score: e.target.value }))} required />
                <input type="number" className={inputCls} style={inputStyle} placeholder="Max %" value={bandForm.max_score} onChange={e => setBandForm(p => ({ ...p, max_score: e.target.value }))} required />
              </div>
              <input className={inputCls} style={inputStyle} placeholder="Remark (Excellent, Pass…)" value={bandForm.remark} onChange={e => setBandForm(p => ({ ...p, remark: e.target.value }))} />
              <button type="submit" className="w-full rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90 flex items-center justify-center gap-2" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}><Plus size={13} /> Add Band</button>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-sm">
                <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Scheme', 'Label', 'Range', 'Remark'].map(h => <th key={h} className="px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>)}
                </tr></thead>
                <tbody>
                  {bands.length === 0 ? <tr><td colSpan={4} className="px-2 py-6 text-center text-xs text-slate-600">No grade bands yet.</td></tr>
                  : bands.map(b => (
                    <tr key={b.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-2 py-2 text-xs text-slate-500">{b.scheme_name}</td>
                      <td className="px-2 py-2 text-base font-bold" style={{ color: gradeColor((Number(b.min_score) + Number(b.max_score)) / 2) }}>{b.label}</td>
                      <td className="px-2 py-2 text-xs font-mono text-slate-400">{b.min_score}–{b.max_score}%</td>
                      <td className="px-2 py-2 text-xs text-slate-500">{b.remark || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Assessments ── */}
      {tab === 'assessments' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2 mb-4"><BookOpen size={13} className="text-sky-400" /> Create Assessment</p>
            <form onSubmit={submitAssessment} className="space-y-3">
              <input className={inputCls} style={inputStyle} placeholder="Assessment name (e.g. Form 2 Mid-Term Mathematics)" value={assessmentForm.name} onChange={e => setAssessmentForm(p => ({ ...p, name: e.target.value }))} required />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <select className={inputCls} style={inputStyle} value={assessmentForm.category} onChange={e => setAssessmentForm(p => ({ ...p, category: e.target.value }))}>
                  {['Classwork','Homework','Test','Exam','Project','Practical'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className={inputCls} style={inputStyle} value={assessmentForm.subject} onChange={e => setAssessmentForm(p => ({ ...p, subject: e.target.value }))} required>
                  <option value="">Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
                </select>
                <select className={inputCls} style={inputStyle} value={assessmentForm.class_section} onChange={e => setAssessmentForm(p => ({ ...p, class_section: e.target.value }))} required>
                  <option value="">Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.display_name ?? c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select className={inputCls} style={inputStyle} value={assessmentForm.term} onChange={e => setAssessmentForm(p => ({ ...p, term: e.target.value }))} required>
                  <option value="">Term</option>{terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input type="number" className={inputCls} style={inputStyle} placeholder="Max marks" value={assessmentForm.max_score} onChange={e => setAssessmentForm(p => ({ ...p, max_score: e.target.value }))} required />
                <input type="number" className={inputCls} style={inputStyle} placeholder="Weight %" value={assessmentForm.weight_percent} onChange={e => setAssessmentForm(p => ({ ...p, weight_percent: e.target.value }))} required />
                <input type="date" className={inputCls} style={inputStyle} value={assessmentForm.date} onChange={e => setAssessmentForm(p => ({ ...p, date: e.target.value }))} required />
              </div>
              <button type="submit" className="rounded-xl px-6 py-2.5 text-sm font-bold transition hover:opacity-90 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}><Plus size={13} /> Create Assessment</button>
            </form>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white">All Assessments <span className="text-[10px] text-slate-500 ml-2 tabular-nums">{assessments.length}</span></p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Name', 'Category', 'Subject', 'Class', 'Term', 'Max', 'Weight', 'Status', 'Action'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>)}
                </tr></thead>
                <tbody>
                  {isLoading ? <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-600">Loading…</td></tr>
                  : assessments.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-600">No assessments yet.</td></tr>
                  : assessments.map(a => (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 text-sm text-slate-200 font-medium">{a.name}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>{a.category}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{a.subject_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{a.class_section_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{a.term_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-300 tabular-nums">{a.max_score}</td>
                      <td className="px-4 py-3 text-xs text-slate-300 tabular-nums">{a.weight_percent}%</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                          style={a.is_published ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' } : { background: 'rgba(148,163,184,0.1)', color: '#94a3b8' }}>
                          {a.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => publishAssessment(a.id)} disabled={a.is_published}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold transition hover:opacity-80 disabled:opacity-30"
                          style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                          Publish
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark Entry ── */}
      {tab === 'marks' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2 mb-4"><ClipboardList size={13} className="text-violet-400" /> Bulk Mark Entry</p>
            <select className={inputCls} style={inputStyle} value={selAssessment} onChange={e => { setSelAssessment(e.target.value); setGradeRows({}) }}>
              <option value="">Select assessment to enter marks…</option>
              {assessments.map(a => <option key={a.id} value={a.id}>{a.name} — {a.class_section_name} ({a.subject_name})</option>)}
            </select>
          </div>

          {currentAssessment && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="text-sm font-bold text-white">{currentAssessment.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{currentAssessment.class_section_name} · {currentAssessment.subject_name} · Max: {currentAssessment.max_score} marks</p>
                </div>
                <button onClick={submitBulkGrades}
                  className="rounded-xl px-4 py-2 text-sm font-bold transition hover:opacity-90"
                  style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                  Save All Marks
                </button>
              </div>
              <table className="w-full">
                <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">Student</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">Adm. No.</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">Score / {currentAssessment.max_score}</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">%</th>
                </tr></thead>
                <tbody>
                  {students.map(s => {
                    const raw = gradeRows[s.id] ?? ''
                    const pct = raw ? Math.round(Number(raw) / Number(currentAssessment.max_score) * 100) : null
                    return (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-3 text-sm text-slate-200">{s.first_name} {s.last_name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{s.admission_number}</td>
                        <td className="px-4 py-3">
                          <input type="number" min={0} max={Number(currentAssessment.max_score)}
                            className="w-24 rounded-xl px-3 py-1.5 text-sm tabular-nums text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500/40"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                            value={raw}
                            onChange={e => setGradeRows(prev => ({ ...prev, [s.id]: e.target.value }))} />
                        </td>
                        <td className="px-4 py-3">
                          {pct !== null ? (
                            <span className="text-sm font-bold tabular-nums" style={{ color: gradeColor(pct) }}>{pct}%</span>
                          ) : <span className="text-slate-700">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Recent grades */}
          {grades.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <p className="text-sm font-bold text-white">Recent Grades</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Assessment', 'Student', 'Raw', '%', 'Band'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {grades.slice(0, 20).map(g => (
                      <tr key={g.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-3 text-xs text-slate-400">{g.assessment}</td>
                        <td className="px-4 py-3 text-sm text-slate-200">{g.student_name}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-300">{g.raw_score}</td>
                        <td className="px-4 py-3 text-xs font-bold tabular-nums" style={{ color: gradeColor(Number(g.percentage)) }}>{Number(g.percentage).toFixed(0)}%</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{g.grade_band_label || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Term Results ── */}
      {tab === 'results' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2 mb-4"><BarChart3 size={13} className="text-emerald-400" /> Compute Term Results</p>
            <p className="text-xs text-slate-500 mb-4">Select a class and term to compute weighted results, class positions and grade bands.</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select className={inputCls} style={inputStyle} value={selClassCompute} onChange={e => setSelClassCompute(e.target.value)}>
                <option value="">Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.display_name ?? c.name}</option>)}
              </select>
              <select className={inputCls} style={inputStyle} value={selTermCompute} onChange={e => setSelTermCompute(e.target.value)}>
                <option value="">Term</option>{terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select className={inputCls} style={inputStyle} value={selSchemeCompute} onChange={e => setSelSchemeCompute(e.target.value)}>
                <option value="">Default scheme</option>{schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={computeResults} disabled={!selClassCompute || !selTermCompute}
                className="rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-40"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                Compute Results
              </button>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white">Term Results <span className="text-[10px] text-slate-500 ml-2 tabular-nums">{results.length}</span></p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Student', 'Class', 'Term', 'Subject', 'Total', 'Grade', 'Rank', 'Pass'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>)}
                </tr></thead>
                <tbody>
                  {results.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-600">No results yet. Select a class and term above, then click Compute.</td></tr>
                  : results.map(r => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 text-sm text-slate-200 font-medium">{r.student_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{r.class_section_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{r.term_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{r.subject_name}</td>
                      <td className="px-4 py-3 text-sm font-bold tabular-nums" style={{ color: gradeColor(Number(r.total_score)) }}>{Number(r.total_score).toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: r.grade_band_label ? gradeColor(Number(r.total_score)) : '#64748b' }}>{r.grade_band_label || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-400">{r.class_rank ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                          style={r.is_pass ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' } : { background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                          {r.is_pass ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

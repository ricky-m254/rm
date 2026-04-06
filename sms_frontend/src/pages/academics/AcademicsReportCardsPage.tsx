import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '../../api/client'
import { cachedGet, invalidateCache } from '../../api/cache'
import { normalizePaginatedResponse } from '../../api/pagination'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import CBCReportCardModal from '../../components/CBCReportCardModal'
import BulkPrintModal from '../../components/BulkPrintModal'
import PageHero from '../../components/PageHero'
import {
  FileText, Download, CheckCircle2, Share2, Zap,
  AlertTriangle, GraduationCap, Users, Eye,
  Printer, Square, CheckSquare, MinusSquare, Search,
} from 'lucide-react'

type SchoolClass = { id: number; display_name?: string; name: string }
type Term = { id: number; name: string }
type ReportCard = {
  id: number
  student: number
  student_name?: string
  class_section: number
  class_section_name?: string
  term: number
  term_name?: string
  academic_year_name?: string
  status: 'Draft' | 'Submitted' | 'Approved' | 'Published' | 'Distributed'
  overall_grade?: string
  class_rank?: number | null
  attendance_days: number
  teacher_remarks?: string
  principal_remarks?: string
  pdf_url?: string
}

function getErrorMessage(err: unknown): string {
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

const STATUS_CFG: Record<ReportCard['status'], { color: string; bg: string; label: string }> = {
  Draft:       { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  label: 'Draft' },
  Submitted:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   label: 'Submitted' },
  Approved:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)',   label: 'Approved' },
  Published:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   label: 'Published' },
  Distributed: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: 'Distributed' },
}

const GRADE_COLOR = (g?: string) => {
  if (!g) return '#94a3b8'
  const n = g.toUpperCase()
  if (n === 'A') return '#10b981'
  if (n.startsWith('B')) return '#38bdf8'
  if (n.startsWith('C')) return '#fbbf24'
  if (n.startsWith('D')) return '#f97316'
  return '#f87171'
}

const STATUS_FILTERS = ['All', 'Draft', 'Submitted', 'Approved', 'Published', 'Distributed'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

export default function AcademicsReportCardsPage() {
  const [classes, setClasses]             = useState<SchoolClass[]>([])
  const [terms, setTerms]                 = useState<Term[]>([])
  const [cards, setCards]                 = useState<ReportCard[]>([])
  const [selClass, setSelClass]           = useState('')
  const [selTerm, setSelTerm]             = useState('')
  const [isLoading, setIsLoading]         = useState(true)
  const [isGenerating, setIsGenerating]   = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [flash, setFlash]                 = useState<string | null>(null)
  const [selectedCard, setSelectedCard]   = useState<ReportCard | null>(null)

  const [selected, setSelected]           = useState<Set<number>>(new Set())
  const [bulkPrintCards, setBulkPrintCards] = useState<ReportCard[] | null>(null)
  const [searchQ, setSearchQ]             = useState('')
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('All')

  const loadAll = useCallback(async (bust = false) => {
    setIsLoading(true); setError(null)
    if (bust) invalidateCache('academics')
    try {
      const [cRes, tRes, rRes] = await Promise.all([
        cachedGet('academics/classes', () => apiClient.get('/academics/classes/').then(r => r.data), 5 * 60_000),
        cachedGet('academics/terms',   () => apiClient.get('/academics/ref/terms/').then(r => r.data), 5 * 60_000),
        cachedGet('academics/report-cards', () => apiClient.get('/academics/report-cards/').then(r => r.data), 60_000),
      ])
      setClasses(normalizePaginatedResponse<SchoolClass>(cRes).items)
      setTerms(normalizePaginatedResponse<Term>(tRes).items)
      setCards(normalizePaginatedResponse<ReportCard>(rRes).items)
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  const generateReportCards = async () => {
    if (!selClass || !selTerm) return
    setIsGenerating(true); setError(null); setFlash(null)
    try {
      const res = await apiClient.post('/academics/report-cards/generate/', {
        class_section: Number(selClass), term: Number(selTerm),
      })
      setFlash((res.data as { message?: string })?.message ?? 'Report cards generated.')
      await loadAll(true)
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setIsGenerating(false) }
  }

  const runAction = async (id: number, action: 'approve' | 'publish') => {
    setError(null); setFlash(null)
    try {
      await apiClient.post(`/academics/report-cards/${id}/${action}/`, {})
      setFlash(`Report card ${action}d.`)
      await loadAll(true)
    } catch (err) { setError(getErrorMessage(err)) }
  }

  const distributePublished = async () => {
    setError(null); setFlash(null)
    try {
      const ids = cards.filter(c => c.status === 'Published').map(c => c.id)
      const res = await apiClient.post('/academics/report-cards/distribute/', { report_card_ids: ids })
      setFlash(`Distributed ${(res.data as { count?: number })?.count ?? 0} report card(s).`)
      await loadAll(true)
    } catch (err) { setError(getErrorMessage(err)) }
  }

  const downloadPdf = async (id: number) => {
    setError(null)
    try {
      const res = await apiClient.get(`/academics/report-cards/${id}/pdf/`, { responseType: 'blob' })
      downloadFromResponse(res as { data: Blob; headers?: Record<string, unknown> }, `report_card_${id}.pdf`)
    } catch (err) { setError(extractApiErrorMessage(err, 'Unable to download PDF.')) }
  }

  const filteredCards = cards.filter(c => {
    const matchStatus = statusFilter === 'All' || c.status === statusFilter
    const matchSearch = searchQ === '' ||
      (c.student_name ?? '').toLowerCase().includes(searchQ.toLowerCase()) ||
      (c.class_section_name ?? '').toLowerCase().includes(searchQ.toLowerCase()) ||
      (c.term_name ?? '').toLowerCase().includes(searchQ.toLowerCase())
    return matchStatus && matchSearch
  })

  const allSelected = filteredCards.length > 0 && filteredCards.every(c => selected.has(c.id))
  const someSelected = filteredCards.some(c => selected.has(c.id)) && !allSelected

  const toggleOne = (id: number) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const next = new Set(prev); filteredCards.forEach(c => next.delete(c.id)); return next })
    } else {
      setSelected(prev => { const next = new Set(prev); filteredCards.forEach(c => next.add(c.id)); return next })
    }
  }

  const selectedCards = cards.filter(c => selected.has(c.id))

  const byStatus = (s: ReportCard['status']) => cards.filter(c => c.status === s).length
  const statusCounts = {
    total: cards.length,
    approved: byStatus('Approved'),
    published: byStatus('Published'),
    distributed: byStatus('Distributed'),
  }

  const CheckboxIcon = allSelected ? CheckSquare : someSelected ? MinusSquare : Square

  return (
    <div className="p-6 space-y-6">
      <PageHero
        badge="ACADEMICS"
        badgeColor="emerald"
        title="Report Cards"
        subtitle="Generate, approve, publish and print CBC learner progress reports"
        icon="📖"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Report Cards</h1>
          <p className="text-slate-400 text-sm mt-0.5">Generate, approve, publish and distribute student report cards</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <button
              onClick={() => setBulkPrintCards(selectedCards)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition hover:opacity-90"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              <Printer size={12} /> Print Selected ({selected.size})
            </button>
          )}
          <button onClick={distributePublished}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition hover:opacity-90"
            style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
            <Share2 size={12} /> Distribute Published
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl p-4 text-sm text-rose-200 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><AlertTriangle size={13} className="text-rose-400 flex-shrink-0" />{error}</div>}
      {flash && <div className="rounded-2xl p-4 text-sm text-emerald-200 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}><CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />{flash}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cards',  value: statusCounts.total,       icon: FileText,    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
          { label: 'Approved',     value: statusCounts.approved,    icon: CheckCircle2,color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
          { label: 'Published',    value: statusCounts.published,   icon: Zap,         color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
          { label: 'Distributed',  value: statusCounts.distributed, icon: Share2,      color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-3 right-3 w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={13} style={{ color: k.color }} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{isLoading ? '…' : k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Zap size={13} className="text-emerald-400" /> Generate Report Cards
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={selClass} onChange={e => setSelClass(e.target.value)}
            className="rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:ring-1 focus:ring-emerald-500/40"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="">Select class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.display_name ?? c.name}</option>)}
          </select>
          <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
            className="rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:ring-1 focus:ring-emerald-500/40"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="">Select term…</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={generateReportCards} disabled={isGenerating || !selClass || !selTerm}
            className="rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
            <GraduationCap size={14} />
            {isGenerating ? 'Generating…' : 'Generate Report Cards'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 flex-1">
            <Users size={14} className="text-violet-400" />
            <p className="text-sm font-bold text-white">Report Card List</p>
            <span className="ml-2 text-[10px] font-bold text-slate-500 tabular-nums">{filteredCards.length} / {cards.length}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search student, class…"
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs text-white placeholder-slate-600 outline-none w-44"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
                  style={statusFilter === s
                    ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                    : { background: 'rgba(255,255,255,0.03)', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="flex items-center justify-center text-slate-500 hover:text-emerald-400 transition">
                    <CheckboxIcon size={15} />
                  </button>
                </th>
                {['Student', 'Class', 'Term', 'Grade', 'Rank', 'Attendance', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-600">Loading report cards…</td></tr>
              ) : filteredCards.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center">
                  <FileText size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">No report cards found.</p>
                  <p className="text-xs text-slate-700 mt-1">Select a class and term above, then click Generate.</p>
                </td></tr>
              ) : filteredCards.map(item => {
                const cfg = STATUS_CFG[item.status]
                const isChecked = selected.has(item.id)
                return (
                  <tr key={item.id}
                    className="hover:bg-white/[0.02] transition"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isChecked ? 'rgba(16,185,129,0.04)' : undefined }}>
                    <td className="px-4 py-3 w-10">
                      <button onClick={() => toggleOne(item.id)} className="flex items-center justify-center transition"
                        style={{ color: isChecked ? '#10b981' : '#475569' }}>
                        {isChecked ? <CheckSquare size={15} /> : <Square size={15} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-200 font-medium">{item.student_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{item.class_section_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{item.term_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold tabular-nums" style={{ color: GRADE_COLOR(item.overall_grade) }}>
                        {item.overall_grade || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{item.class_rank ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{item.attendance_days} days</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(item.status === 'Draft' || item.status === 'Submitted') && (
                          <button onClick={() => runAction(item.id, 'approve')}
                            className="rounded-lg px-2 py-1 text-[10px] font-bold transition hover:opacity-80"
                            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                            Approve
                          </button>
                        )}
                        {item.status === 'Approved' && (
                          <button onClick={() => runAction(item.id, 'publish')}
                            className="rounded-lg px-2 py-1 text-[10px] font-bold transition hover:opacity-80"
                            style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                            Publish
                          </button>
                        )}
                        <button onClick={() => setSelectedCard(item)}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold transition hover:opacity-80 flex items-center gap-1"
                          style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                          <Eye size={9} /> View
                        </button>
                        <button onClick={() => setBulkPrintCards([item])}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold transition hover:opacity-80 flex items-center gap-1"
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.15)' }}>
                          <Printer size={9} /> Print
                        </button>
                        <button onClick={() => downloadPdf(item.id)}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold transition hover:opacity-80 flex items-center gap-1"
                          style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}>
                          <Download size={9} /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {selected.size > 0 && (
          <div className="px-5 py-3 flex items-center gap-3 flex-wrap"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(16,185,129,0.04)' }}>
            <span className="text-xs text-emerald-400 font-bold">{selected.size} card{selected.size !== 1 ? 's' : ''} selected</span>
            <button
              onClick={() => setBulkPrintCards(selectedCards)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition hover:opacity-90"
              style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              <Printer size={12} /> Print Selected ({selected.size})
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-slate-500 hover:text-slate-300 transition">
              Clear selection
            </button>
          </div>
        )}
      </div>

      {selectedCard && (
        <CBCReportCardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}

      {bulkPrintCards && bulkPrintCards.length > 0 && (
        <BulkPrintModal cards={bulkPrintCards} onClose={() => setBulkPrintCards(null)} />
      )}
    </div>
  )
}

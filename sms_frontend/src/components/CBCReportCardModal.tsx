import { useEffect, useRef } from 'react'
import { X, Printer, GraduationCap, Star, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from 'lucide-react'

interface ReportCardData {
  id: number
  student_name?: string
  class_section_name?: string
  term_name?: string
  academic_year_name?: string
  status: string
  overall_grade?: string
  class_rank?: number | null
  attendance_days: number
  teacher_remarks?: string
  principal_remarks?: string
}

interface SubjectScore {
  subject: string
  strand: string
  score: number
  competency: 'EE' | 'ME' | 'AE' | 'BE'
}

const CBC_SUBJECTS: SubjectScore[] = [
  { subject: 'English',                   strand: 'Language & Communication',       score: 84, competency: 'ME' },
  { subject: 'Kiswahili',                 strand: 'Lugha na Mawasiliano',            score: 91, competency: 'EE' },
  { subject: 'Mathematics',              strand: 'Numbers & Algebra',               score: 78, competency: 'ME' },
  { subject: 'Science & Technology',     strand: 'Inquiry & Investigation',          score: 82, competency: 'ME' },
  { subject: 'Social Studies',           strand: 'Society & Environment',           score: 88, competency: 'EE' },
  { subject: 'Religious Education',      strand: 'Values & Spiritual Development',  score: 95, competency: 'EE' },
  { subject: 'Creative Arts & Crafts',   strand: 'Creativity & Imagination',        score: 72, competency: 'AE' },
  { subject: 'Physical & Health Educ.', strand: 'Movement & Body Awareness',        score: 90, competency: 'EE' },
  { subject: 'Agriculture & Nutrition',  strand: 'Food & Farming Systems',          score: 76, competency: 'ME' },
  { subject: 'Music',                    strand: 'Arts & Culture',                  score: 68, competency: 'AE' },
  { subject: 'Home Science',             strand: 'Life Skills & Wellbeing',         score: 80, competency: 'ME' },
]

type CompetencyLevel = 'EE' | 'ME' | 'AE' | 'BE'

const COMPETENCY: Record<CompetencyLevel, { label: string; color: string; bg: string; printBg: string; Icon: typeof Star; desc: string }> = {
  EE: { label: 'Exceeds Expectation',    color: '#10b981', bg: 'rgba(16,185,129,0.14)', printBg: '#d1fae5', Icon: Star,          desc: 'Outstanding performance' },
  ME: { label: 'Meets Expectation',      color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  printBg: '#e0f2fe', Icon: CheckCircle2,  desc: 'Satisfactory performance' },
  AE: { label: 'Approaching Expectation',color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  printBg: '#fef3c7', Icon: AlertTriangle,  desc: 'Needs improvement' },
  BE: { label: 'Below Expectation',      color: '#f87171', bg: 'rgba(248,113,113,0.12)', printBg: '#fee2e2', Icon: XCircle,        desc: 'Requires immediate support' },
}

function scoreToCompetency(score: number): CompetencyLevel {
  if (score >= 85) return 'EE'
  if (score >= 70) return 'ME'
  if (score >= 50) return 'AE'
  return 'BE'
}

function CompetencyBadge({ level }: { level: CompetencyLevel }) {
  const cfg = COMPETENCY[level]
  const Icon = cfg.Icon
  return (
    <span className="no-print-filter inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide print:text-[8px]"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
      <Icon size={8} />
      {level}
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#38bdf8' : score >= 50 ? '#fbbf24' : '#f87171'
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden print:h-1" style={{ background: 'rgba(255,255,255,0.07)' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
    </div>
  )
}

interface Props {
  card: ReportCardData
  onClose: () => void
}

export default function CBCReportCardModal({ card, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const subjects = CBC_SUBJECTS.map(s => ({
    ...s,
    competency: scoreToCompetency(s.score) as CompetencyLevel,
  }))

  const avg = Math.round(subjects.reduce((a, s) => a + s.score, 0) / subjects.length)
  const eeCount = subjects.filter(s => s.competency === 'EE').length
  const meCount = subjects.filter(s => s.competency === 'ME').length
  const aeCount = subjects.filter(s => s.competency === 'AE').length
  const beCount = subjects.filter(s => s.competency === 'BE').length
  const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })

  const handlePrint = () => {
    const printContent = modalRef.current
    if (!printContent) return
    const original = document.body.innerHTML
    document.body.innerHTML = printContent.innerHTML
    window.print()
    document.body.innerHTML = original
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Modal chrome — no-print wrapper */}
      <div className="no-print absolute top-4 right-4 flex gap-2 z-10 print:hidden">
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: 'rgba(16,185,129,0.85)', border: '1px solid rgba(16,185,129,0.4)' }}>
          <Printer size={15} /> Print / Save PDF
        </button>
        <button onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
          <X size={18} />
        </button>
      </div>

      {/* Report Card content */}
      <div ref={modalRef}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl"
        style={{ background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 120px rgba(0,0,0,0.8)' }}>

        {/* Header */}
        <div className="relative overflow-hidden px-8 py-7 print:py-5 print:px-6"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(56,189,248,0.08) 100%)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', transform: 'translate(30%,-40%)' }} />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 print:w-10 print:h-10"
                style={{ background: 'linear-gradient(135deg,#10b981,#0891b2)', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}>
                <GraduationCap size={28} className="text-white print:hidden" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400/70 mb-1">CBC Kenya · Learner Progress Report</p>
                <h1 className="text-xl font-display font-bold text-white leading-tight print:text-lg">
                  {card.student_name ?? 'Student Name'}
                </h1>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  {card.class_section_name} &nbsp;·&nbsp; {card.term_name} &nbsp;·&nbsp; {card.academic_year_name}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl print:w-12 print:h-12"
                style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.25),rgba(16,185,129,0.08))', border: '2px solid rgba(16,185,129,0.3)' }}>
                <span className="text-2xl font-display font-bold text-emerald-400 print:text-xl">{card.overall_grade ?? 'A'}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">Overall Grade</p>
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-4 gap-3 mt-5 print:mt-3">
            {[
              { label: 'Average Score', value: `${avg}%`, color: '#10b981' },
              { label: 'Class Rank',    value: card.class_rank ? `#${card.class_rank}` : '—', color: '#38bdf8' },
              { label: 'Attendance',    value: `${card.attendance_days} days`, color: '#a78bfa' },
              { label: 'Date Issued',   value: today, color: '#fbbf24' },
            ].map(s => (
              <div key={s.label} className="rounded-xl px-3 py-2.5 print:py-1.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[9px] uppercase tracking-[0.15em] mb-1" style={{ color: `${s.color}99` }}>{s.label}</p>
                <p className="text-[13px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CBC Competency Legend */}
        <div className="px-8 py-3 print:px-6 print:py-2 flex flex-wrap gap-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
          <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold self-center mr-1">Key:</span>
          {(Object.keys(COMPETENCY) as CompetencyLevel[]).map(k => {
            const c = COMPETENCY[k]
            const Icon = c.Icon
            return (
              <span key={k} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}33` }}>
                <Icon size={9} />
                <strong>{k}</strong> — {c.label}
              </span>
            )
          })}
        </div>

        {/* Competency distribution */}
        <div className="px-8 py-4 print:px-6 print:py-3">
          <div className="grid grid-cols-4 gap-2 print:gap-1.5">
            {([['EE', eeCount], ['ME', meCount], ['AE', aeCount], ['BE', beCount]] as [CompetencyLevel, number][]).map(([k, cnt]) => {
              const c = COMPETENCY[k]
              const Icon = c.Icon
              return (
                <div key={k} className="rounded-2xl p-3 text-center print:p-2"
                  style={{ background: c.bg, border: `1px solid ${c.color}33` }}>
                  <Icon size={18} style={{ color: c.color }} className="mx-auto mb-1" />
                  <p className="text-2xl font-display font-bold print:text-xl" style={{ color: c.color }}>{cnt}</p>
                  <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: `${c.color}90` }}>{k} subjects</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Subject table */}
        <div className="px-8 pb-6 print:px-6 print:pb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Learning Area Performance</h3>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-slate-500">Learning Area</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Strand</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">Score</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-slate-500 w-32 hidden sm:table-cell">Progress</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">Level</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, i) => {
                  const c = COMPETENCY[s.competency]
                  return (
                    <tr key={s.subject}
                      className="transition-colors hover:bg-white/[0.015]"
                      style={{ borderBottom: i < subjects.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <td className="px-4 py-3 print:py-2">
                        <p className="text-[12px] font-semibold text-slate-200 print:text-[10px]">{s.subject}</p>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 hidden sm:table-cell print:text-[9px]">{s.strand}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[13px] font-bold tabular-nums print:text-[11px]" style={{ color: c.color }}>{s.score}%</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <ScoreBar score={s.score} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CompetencyBadge level={s.competency} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks */}
        <div className="px-8 pb-6 print:px-6 print:pb-4 grid sm:grid-cols-2 gap-4">
          {[
            { title: "Class Teacher's Remarks", text: card.teacher_remarks || 'A diligent and focused learner who participates actively in class. Demonstrates strong analytical skills and a positive attitude towards learning. Keep up the excellent work!', color: '#38bdf8', Icon: TrendingUp },
            { title: "Principal's Remarks",     text: card.principal_remarks || 'Congratulations on a successful term. Continue to uphold our school values of excellence, integrity and community service. We look forward to seeing your continued growth.', color: '#a78bfa', Icon: Star },
          ].map(r => (
            <div key={r.title} className="rounded-2xl p-4 print:p-3"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-2">
                <r.Icon size={12} style={{ color: r.color }} />
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: r.color }}>{r.title}</p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed italic print:text-[10px]">"{r.text}"</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 print:px-6 print:py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
          <div>
            <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em] font-bold">RSM · Rynatyschool Management</p>
            <p className="text-[9px] text-slate-700">Powered by Rynatyspace Technologies · CBC Kenya Framework</p>
          </div>
          <div className="text-right">
            <div className="h-px w-32 mb-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <p className="text-[9px] text-slate-600">Authorised Signature</p>
          </div>
        </div>
      </div>
    </div>
  )
}

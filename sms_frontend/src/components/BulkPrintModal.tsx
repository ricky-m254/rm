import { useRef } from 'react'
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

const COMPETENCY: Record<CompetencyLevel, { label: string; color: string; bg: string; Icon: typeof Star }> = {
  EE: { label: 'Exceeds Expectation',     color: '#10b981', bg: 'rgba(16,185,129,0.14)',  Icon: Star },
  ME: { label: 'Meets Expectation',       color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  Icon: CheckCircle2 },
  AE: { label: 'Approaching Expectation', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  Icon: AlertTriangle },
  BE: { label: 'Below Expectation',       color: '#f87171', bg: 'rgba(248,113,113,0.12)', Icon: XCircle },
}

function scoreToCompetency(score: number): CompetencyLevel {
  if (score >= 85) return 'EE'
  if (score >= 70) return 'ME'
  if (score >= 50) return 'AE'
  return 'BE'
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

function SingleCard({ card, index, total }: { card: ReportCardData; index: number; total: number }) {
  const subjects = CBC_SUBJECTS.map(s => ({ ...s, competency: scoreToCompetency(s.score) as CompetencyLevel }))
  const avg = Math.round(subjects.reduce((a, s) => a + s.score, 0) / subjects.length)
  const eeCount = subjects.filter(s => s.competency === 'EE').length
  const meCount = subjects.filter(s => s.competency === 'ME').length
  const aeCount = subjects.filter(s => s.competency === 'AE').length
  const beCount = subjects.filter(s => s.competency === 'BE').length
  const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
  const isLast = index === total - 1

  return (
    <div
      style={{
        pageBreakAfter: isLast ? 'auto' : 'always',
        breakAfter: isLast ? 'auto' : 'page',
        background: '#0d1526',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        marginBottom: isLast ? 0 : '32px',
        overflow: 'hidden',
      }}
    >
      <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(56,189,248,0.08) 100%)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '28px 32px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg,#10b981,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GraduationCap size={26} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(16,185,129,0.7)', marginBottom: '4px' }}>CBC Kenya · Learner Progress Report</p>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: 1.2, margin: 0 }}>{card.student_name ?? 'Student'}</h2>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{card.class_section_name} · {card.term_name} · {card.academic_year_name}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg,rgba(16,185,129,0.25),rgba(16,185,129,0.08))', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: GRADE_COLOR(card.overall_grade) }}>{card.overall_grade ?? 'A'}</span>
            </div>
            <p style={{ fontSize: '9px', color: '#64748b', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Overall Grade</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginTop: '18px' }}>
          {[
            { label: 'Average Score', value: `${avg}%`,                      color: '#10b981' },
            { label: 'Class Rank',    value: card.class_rank ? `#${card.class_rank}` : '—', color: '#38bdf8' },
            { label: 'Attendance',    value: `${card.attendance_days} days`,  color: '#a78bfa' },
            { label: 'Date Issued',   value: today,                           color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: '10px', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.15em', color: `${s.color}99`, marginBottom: '2px' }}>{s.label}</p>
              <p style={{ fontSize: '12px', fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginRight: '4px' }}>Key:</span>
        {(Object.keys(COMPETENCY) as CompetencyLevel[]).map(k => {
          const c = COMPETENCY[k]
          const Icon = c.Icon
          return (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.color}33` }}>
              <Icon size={8} /><strong>{k}</strong> — {c.label}
            </span>
          )
        })}
      </div>

      <div style={{ padding: '14px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
          {([['EE', eeCount], ['ME', meCount], ['AE', aeCount], ['BE', beCount]] as [CompetencyLevel, number][]).map(([k, cnt]) => {
            const c = COMPETENCY[k]
            const Icon = c.Icon
            return (
              <div key={k} style={{ borderRadius: '14px', padding: '10px', textAlign: 'center', background: c.bg, border: `1px solid ${c.color}33` }}>
                <Icon size={16} color={c.color} style={{ margin: '0 auto 4px' }} />
                <p style={{ fontSize: '20px', fontWeight: 700, color: c.color, margin: 0 }}>{cnt}</p>
                <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: `${c.color}90`, marginTop: '2px' }}>{k} subjects</p>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '0 32px 20px' }}>
        <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#475569', marginBottom: '10px' }}>Learning Area Performance</p>
        <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Learning Area', 'Strand', 'Score', 'Level'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => {
                const c = COMPETENCY[s.competency]
                const Icon = c.Icon
                return (
                  <tr key={s.subject} style={{ borderBottom: i < subjects.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '8px 14px', fontSize: '11px', fontWeight: 600, color: '#e2e8f0' }}>{s.subject}</td>
                    <td style={{ padding: '8px 14px', fontSize: '10px', color: '#64748b' }}>{s.strand}</td>
                    <td style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700, color: c.color }}>{s.score}%</td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '99px', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', background: c.bg, color: c.color, border: `1px solid ${c.color}33` }}>
                        <Icon size={7} />{s.competency}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ padding: '0 32px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {[
          { title: "Class Teacher's Remarks", text: card.teacher_remarks || 'A diligent and focused learner who participates actively in class. Demonstrates strong analytical skills and a positive attitude towards learning.', color: '#38bdf8', Icon: TrendingUp },
          { title: "Principal's Remarks",     text: card.principal_remarks || 'Congratulations on a successful term. Continue to uphold our school values of excellence, integrity and community service.', color: '#a78bfa', Icon: Star },
        ].map(r => (
          <div key={r.title} style={{ borderRadius: '14px', padding: '12px 14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <r.Icon size={11} color={r.color} />
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: r.color, margin: 0 }}>{r.title}</p>
            </div>
            <p style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>"{r.text}"</p>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 32px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '8px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, margin: 0 }}>RSM · Rynatyschool Management</p>
          <p style={{ fontSize: '8px', color: '#1e293b', margin: 0 }}>Powered by Rynatyspace Technologies · CBC Kenya Framework</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ height: '1px', width: '120px', background: 'rgba(255,255,255,0.15)', marginBottom: '4px' }} />
          <p style={{ fontSize: '8px', color: '#334155', margin: 0 }}>Authorised Signature</p>
        </div>
      </div>
    </div>
  )
}

interface BulkPrintModalProps {
  cards: ReportCardData[]
  onClose: () => void
}

export default function BulkPrintModal({ cards, onClose }: BulkPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null)

  const handleBulkPrint = () => {
    const el = printAreaRef.current
    if (!el) return
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Report Cards — Bulk Print (${cards.length})</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #0a0f1a; font-family: 'Inter', sans-serif; padding: 24px; }
            @page { size: A4; margin: 12mm; }
            @media print {
              body { padding: 0; }
              .page-break { page-break-after: always; break-after: page; }
            }
          </style>
        </head>
        <body>
          ${el.innerHTML}
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}>

      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 print:hidden"
        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <p className="text-sm font-bold text-white">Bulk Print — {cards.length} Report Card{cards.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-slate-500 mt-0.5">Each card prints on a separate page</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkPrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: 'rgba(16,185,129,0.85)', border: '1px solid rgba(16,185,129,0.4)' }}>
            <Printer size={15} /> Print All ({cards.length}) / Save PDF
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div ref={printAreaRef} className="space-y-8 max-w-3xl mx-auto">
          {cards.map((card, i) => (
            <SingleCard key={card.id} card={card} index={i} total={cards.length} />
          ))}
        </div>
      </div>
    </div>
  )
}

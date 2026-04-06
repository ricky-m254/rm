import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type GradeEntry = {
  subject: string
  grade: string
  score: number | null
  max_score: number | null
  assessment: string
  date: string | null
  remarks: string | null
}

type ReportCard = {
  term: string
  academic_year: string
  class_section: string
  average_grade: string | null
  position: number | null
  subjects: Array<{ subject: string; grade: string; remarks: string | null }>
}

export default function StudentPortalGradesPage() {
  const [grades, setGrades] = useState<GradeEntry[]>([])
  const [reportCards, setReportCards] = useState<ReportCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'grades' | 'reports'>('grades')

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    Promise.allSettled([
      apiClient.get<{ grades: GradeEntry[] }>('/student-portal/academics/grades/'),
      apiClient.get<{ report_cards: ReportCard[] }>('/student-portal/academics/report-cards/'),
    ]).then(([gradesRes, reportsRes]) => {
      if (!mounted) return
      if (gradesRes.status === 'fulfilled') setGrades(gradesRes.value.data.grades ?? [])
      if (reportsRes.status === 'fulfilled') setReportCards(reportsRes.value.data.report_cards ?? [])
      setIsLoading(false)
    }).catch(() => {
      if (mounted) { setError('Unable to load grade data.'); setIsLoading(false) }
    })
    return () => { mounted = false }
  }, [])

  const gradeColor = (g: string) => {
    const upper = g?.toUpperCase()
    if (upper === 'A' || upper === 'EE' || upper === 'ME') return '#10b981'
    if (upper === 'B' || upper === 'AE') return '#38bdf8'
    if (upper === 'C') return '#f59e0b'
    return '#94a3b8'
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">My Grades</h1>
        <p className="text-slate-500 text-sm mt-1">Assessment results and report cards</p>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <div className="flex gap-2">
        {(['grades', 'reports'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${tab === t ? 'bg-sky-500/20 text-sky-300' : 'text-slate-500 hover:text-slate-300'}`}>
            {t === 'grades' ? 'Assessment Grades' : 'Report Cards'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Loading grades…</p>
      ) : tab === 'grades' ? (
        <div className="rounded-2xl p-5" style={GLASS}>
          {grades.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No assessment grades recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] text-left text-xs text-slate-500">
                    <th className="pb-3 pr-4">Subject</th>
                    <th className="pb-3 pr-4">Assessment</th>
                    <th className="pb-3 pr-4">Score</th>
                    <th className="pb-3 pr-4">Grade</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {grades.map((g, i) => (
                    <tr key={i} className="hover:bg-white/[0.015]">
                      <td className="py-2.5 pr-4 font-medium text-slate-200">{g.subject}</td>
                      <td className="py-2.5 pr-4 text-slate-400">{g.assessment}</td>
                      <td className="py-2.5 pr-4 text-slate-400 font-mono">
                        {g.score != null ? `${g.score}${g.max_score != null ? ` / ${g.max_score}` : ''}` : '—'}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ color: gradeColor(g.grade), background: `${gradeColor(g.grade)}18` }}>
                          {g.grade}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 text-xs">{g.date ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reportCards.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No report cards available yet.</p>
          ) : reportCards.map((rc, i) => (
            <div key={i} className="rounded-2xl p-5" style={GLASS}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-200">{rc.term} — {rc.academic_year}</h3>
                  <p className="text-xs text-slate-500">{rc.class_section}</p>
                </div>
                <div className="flex gap-4 text-right">
                  {rc.average_grade && <div><p className="text-xs text-slate-500">Average</p><p className="font-bold text-emerald-400">{rc.average_grade}</p></div>}
                  {rc.position != null && <div><p className="text-xs text-slate-500">Position</p><p className="font-bold text-sky-300">#{rc.position}</p></div>}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-left text-xs text-slate-500">
                      <th className="pb-2 pr-4">Subject</th>
                      <th className="pb-2 pr-4">Grade</th>
                      <th className="pb-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {rc.subjects.map((s, si) => (
                      <tr key={si}>
                        <td className="py-2 pr-4 text-slate-300">{s.subject}</td>
                        <td className="py-2 pr-4">
                          <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ color: gradeColor(s.grade), background: `${gradeColor(s.grade)}18` }}>
                            {s.grade}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-slate-500">{s.remarks ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

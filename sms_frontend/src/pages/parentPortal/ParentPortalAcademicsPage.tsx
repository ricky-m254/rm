import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { GraduationCap, BookOpen, Trophy, TrendingUp } from 'lucide-react'
import { getParentPortalErrorMessage } from './errors'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Grade = {
  id: number
  subject: string
  total_score: number | null
  grade: string
  class_rank: number | null
  is_pass: boolean
}

type ReportCard = {
  id: number
  academic_year: string
  term: string
  status: string
  overall_grade: string | null
}

export default function ParentPortalAcademicsPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [cards, setCards] = useState<ReportCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'grades' | 'reports'>('grades')

  useEffect(() => {
    Promise.all([
      apiClient.get('/parent-portal/academics/grades/'),
      apiClient.get('/parent-portal/academics/report-cards/'),
    ])
      .then(([g, c]) => {
        setGrades(Array.isArray(g.data) ? g.data : [])
        setCards(Array.isArray(c.data) ? c.data : [])
      })
      .catch(err => setError(getParentPortalErrorMessage(err, 'Unable to load academic data.')))
      .finally(() => setLoading(false))
  }, [])

  const passCount = grades.filter(g => g.is_pass).length
  const avgScore = grades.length
    ? (grades.reduce((s, g) => s + (g.total_score ?? 0), 0) / grades.length).toFixed(1)
    : '—'

  const gradeColor = (g: string) => {
    const u = g?.toUpperCase()
    if (u === 'A' || u === 'EE' || u === 'ME') return '#10b981'
    if (u === 'B' || u === 'AE') return '#38bdf8'
    if (u === 'C') return '#f59e0b'
    return '#94a3b8'
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">ACADEMICS</p>
        <h1 className="text-2xl font-display font-bold text-white">Academic Performance</h1>
        <p className="text-slate-500 text-sm mt-1">Your child's grades and report cards</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Subjects', value: grades.length, icon: BookOpen, color: '#10b981' },
          { label: 'Average Score', value: avgScore, icon: TrendingUp, color: '#38bdf8' },
          { label: 'Subjects Passed', value: passCount, icon: GraduationCap, color: '#a855f7' },
          { label: 'Report Cards', value: cards.length, icon: Trophy, color: '#f59e0b' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={GLASS}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={13} style={{ color: k.color }} />
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{k.label}</p>
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(['grades', 'reports'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${tab === t ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500 hover:text-slate-300'}`}>
            {t === 'grades' ? 'Term Grades' : 'Report Cards'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading academic records…</div>
      ) : tab === 'grades' ? (
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          {grades.length === 0 ? (
            <p className="text-center py-10 text-sm text-slate-500">No term grades recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {['Subject', 'Score', 'Grade', 'Class Rank', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {grades.map((g, i) => (
                  <tr key={g.id} className={`hover:bg-white/[0.015] transition-colors ${i % 2 !== 0 ? 'bg-white/[0.008]' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-200">{g.subject}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{g.total_score ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ color: gradeColor(g.grade), background: `${gradeColor(g.grade)}20` }}>
                        {g.grade || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{g.class_rank ? `#${g.class_rank}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${g.is_pass ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                        {g.is_pass ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {cards.length === 0 ? (
            <div className="rounded-2xl p-10 text-center text-sm text-slate-500" style={GLASS}>No report cards generated yet.</div>
          ) : cards.map(c => (
            <div key={c.id} className="rounded-2xl p-5 flex items-center justify-between gap-4" style={GLASS}>
              <div>
                <p className="font-semibold text-slate-200">{c.term} — {c.academic_year}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    {c.status}
                  </span>
                </p>
              </div>
              {c.overall_grade && (
                <span className="text-3xl font-bold font-mono" style={{ color: gradeColor(c.overall_grade) }}>{c.overall_grade}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

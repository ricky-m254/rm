import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type AtRiskStudent = {
  id: number
  name: string
  admission_number: string
  risk_level: 'High' | 'Medium' | 'Low'
  reason: string
}

export default function AnalyticsAtRiskPage() {
  const [data, setData] = useState<AtRiskStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    apiClient.get<AtRiskStudent[]>('/analytics/at-risk/')
      .then(res => setData(res.data))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6 font-sans">
      <PageHero
        badge="ANALYTICS"
        badgeColor="emerald"
        title="At-Risk Students"
        subtitle="Students identified by the system as needing intervention."
        icon="📊"
      />

      {isLoading ? (
        <div className="rounded-2xl glass-panel p-6 text-slate-300 font-sans">Loading...</div>
      ) : (
        <div className="rounded-2xl glass-panel p-6 font-sans">
          <div className="space-y-4 font-sans">
            {data.map((student) => (
              <div key={student.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-slate-950/60 p-5 font-sans">
                <div className="font-sans">
                  <h3 className="font-semibold text-slate-200 font-sans">{student.name}</h3>
                  <p className="text-xs text-slate-500 font-sans">{student.admission_number}</p>
                </div>
                <div className="text-center font-sans">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold font-sans ${
                    student.risk_level === 'High' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                    student.risk_level === 'Medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {student.risk_level} Risk
                  </span>
                </div>
                <div className="max-w-md text-right font-sans">
                  <p className="text-sm text-slate-400 font-sans">{student.reason}</p>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <p className="text-center text-sm text-slate-500 py-10 font-sans">No students currently identified at risk.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

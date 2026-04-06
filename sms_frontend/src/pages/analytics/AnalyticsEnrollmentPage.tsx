import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type EnrollmentTrend = {
  date: string
  count: number
}

export default function AnalyticsEnrollmentPage() {
  const [data, setData] = useState<EnrollmentTrend[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    apiClient.get<EnrollmentTrend[]>('/analytics/enrollment-trend/')
      .then(res => setData(res.data))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6 font-sans">
      <PageHero
        badge="ANALYTICS"
        badgeColor="emerald"
        title="Enrollment Trends"
        subtitle="Historical view of student population growth."
        icon="📊"
      />

      {isLoading ? (
        <div className="rounded-2xl glass-panel p-6 text-slate-300">Loading...</div>
      ) : (
        <div className="rounded-2xl glass-panel p-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-4">Academic Year / Period</th>
                  <th className="px-6 py-4 text-right">Total Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.map((item, idx) => (
                  <tr key={idx} className="bg-slate-950/40 hover:bg-white/[0.02] transition-colors font-sans">
                    <td className="px-6 py-4 text-slate-200 font-sans">{item.date}</td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-semibold font-sans">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

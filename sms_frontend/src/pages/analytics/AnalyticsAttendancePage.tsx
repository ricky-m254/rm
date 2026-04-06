import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type AttendanceTrend = {
  date: string
  rate: number
}

export default function AnalyticsAttendancePage() {
  const [data, setData] = useState<AttendanceTrend[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    apiClient.get<AttendanceTrend[]>('/analytics/attendance-trend/')
      .then(res => setData(res.data))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6 font-sans">
      <PageHero
        badge="ANALYTICS"
        badgeColor="emerald"
        title="Attendance Analytics"
        subtitle="School-wide attendance percentage trends."
        icon="📊"
      />

      {isLoading ? (
        <div className="rounded-2xl glass-panel p-6 text-slate-300 font-sans">Loading...</div>
      ) : (
        <div className="rounded-2xl glass-panel p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 font-sans">
            {data.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 font-sans">
                <p className="text-xs text-slate-500 font-sans">{item.date}</p>
                <p className="mt-1 text-xl font-semibold text-emerald-400 font-sans">{item.rate}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

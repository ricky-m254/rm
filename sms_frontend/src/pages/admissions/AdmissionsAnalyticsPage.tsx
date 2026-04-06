import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type FunnelResponse = {
  counts: Record<string, number>
  rates: Record<string, number>
}

type SourceRow = {
  source: string
  total: number
  applied: number
  conversion_pct: number
}

export default function AdmissionsAnalyticsPage() {
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null)
  const [sources, setSources] = useState<SourceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [funnelRes, sourcesRes] = await Promise.all([
          apiClient.get('/admissions/analytics/funnel/'),
          apiClient.get('/admissions/analytics/sources/'),
        ])
        setFunnel(funnelRes.data)
        setSources(sourcesRes.data?.sources ?? [])
      } catch {
        setError('Unable to load admissions analytics.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <PageHero
        badge="ADMISSIONS"
        badgeColor="violet"
        title="Analytics"
        subtitle="Analytics management and overview."
        icon="📋"
      />

      {error ? (
        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </section>
      ) : null}
      {isLoading ? (
        <section className="rounded-2xl glass-panel p-4 text-sm text-slate-400">
          Loading analytics...
        </section>
      ) : null}

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-display font-semibold">Funnel</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {Object.entries(funnel?.counts ?? {}).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">
              <p className="text-xs uppercase text-slate-400">{key.replace(/_/g, ' ')}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(funnel?.rates ?? {}).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">
              <p className="text-xs uppercase text-slate-400">{key.replace(/_/g, ' ')}</p>
              <p className="mt-2 text-xl font-semibold">{value}%</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-display font-semibold">Inquiry Sources</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3">Conversion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sources.map((row) => (
                <tr key={row.source} className="bg-slate-950/60">
                  <td className="px-4 py-3">{row.source}</td>
                  <td className="px-4 py-3">{row.total}</td>
                  <td className="px-4 py-3">{row.applied}</td>
                  <td className="px-4 py-3">{row.conversion_pct}%</td>
                </tr>
              ))}
              {sources.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={4}>
                    No source analytics available.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { BarChart3, TrendingDown, TrendingUp, Package, DollarSign, FileText } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

interface DepartmentUsage {
  dept: string
  value: number
  pct: number
}

interface TopConsumedItem {
  item: string
  department: string
  consumed: number
  unit: string
  value: number
}

interface MonthlyProcurementPoint {
  month: string
  value: number
}

interface StoreReportsData {
  report_month_label: string
  total_inventory_value: number
  tracked_items: number
  low_stock_items: number
  monthly_procurement_total: number
  monthly_consumption_total: number
  procurement_change_pct: number | null
  monthly_procurement: MonthlyProcurementPoint[]
  department_usage: DepartmentUsage[]
  top_consumed_items: TopConsumedItem[]
}

const currency = (value: number) => `Ksh ${Math.round(value).toLocaleString()}`

export default function StoreReportsPage() {
  const [data, setData] = useState<StoreReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get('/store/reports/')
      .then(response => {
        setData(response.data)
        setError(null)
      })
      .catch(() => setError('Unable to load store reports right now.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-8 text-slate-400">Loading reports...</div>
  }

  if (error || !data) {
    return <div className="p-8 text-amber-300">{error ?? 'Store reports are unavailable right now.'}</div>
  }

  const maxProcurement = Math.max(...data.monthly_procurement.map(point => point.value), 1)
  const procurementTrend = data.procurement_change_pct == null
    ? 'No prior month baseline'
    : `${data.procurement_change_pct >= 0 ? '+' : ''}${data.procurement_change_pct.toFixed(1)}% vs last month`

  return (
    <div className="space-y-6">
      <PageHero
        title="Inventory Reports & Analytics"
        subtitle="Live stock consumption trends, department usage, and procurement activity"
        icon={BarChart3}
        theme="sky"
        stats={[
          { label: 'Inventory Value', value: `Ksh ${(data.total_inventory_value / 1000).toFixed(0)}k` },
          { label: 'Issued Value', value: `Ksh ${(data.monthly_consumption_total / 1000).toFixed(0)}k` },
          { label: 'Low Stock Items', value: data.low_stock_items },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { label: 'Total Inventory Value', value: currency(data.total_inventory_value), icon: Package, color: 'text-emerald-400', sub: `${data.tracked_items} active items tracked` },
          { label: 'Monthly Procurement', value: currency(data.monthly_procurement_total), icon: DollarSign, color: 'text-sky-400', sub: procurementTrend, trend: data.procurement_change_pct != null },
          { label: 'Consumption (Month)', value: currency(data.monthly_consumption_total), icon: TrendingDown, color: 'text-amber-400', sub: `${data.department_usage.length} departments` },
        ].map(card => (
          <div key={card.label} className="glass-panel rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="mt-2 text-2xl font-bold font-display">{card.value}</p>
                <p className={`mt-1 text-xs ${card.trend ? 'text-emerald-400' : 'text-slate-500'}`}>{card.sub}</p>
              </div>
              <card.icon className={`mt-1 ${card.color}`} size={22} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-sky-400" />
            <h3 className="font-display font-semibold text-sm">Monthly Procurement Receipts (Ksh)</h3>
          </div>
          <div className="flex items-end gap-3 h-40">
            {data.monthly_procurement.map(point => (
              <div key={point.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-500">{Math.round(point.value / 1000)}k</span>
                <div
                  className="w-full rounded-t-lg bg-sky-500/40 border border-sky-500/30 transition-all"
                  style={{ height: `${(point.value / maxProcurement) * 100}%` }}
                />
                <span className="text-xs text-slate-400">{point.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={16} className="text-violet-400" />
            <h3 className="font-display font-semibold text-sm">Department Usage (Ksh)</h3>
          </div>
          {!data.department_usage.length ? (
            <p className="text-sm text-slate-500">No department issuances recorded this month.</p>
          ) : (
            <div className="space-y-3">
              {data.department_usage.map(department => (
                <div key={department.dept}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{department.dept}</span>
                    <span className="text-slate-400">{currency(department.value)} ({department.pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06]">
                    <div className="h-2 rounded-full bg-violet-500/60" style={{ width: `${department.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-amber-400" />
            <h3 className="font-display font-semibold text-sm">Top Consumed Items - {data.report_month_label}</h3>
          </div>
        </div>
        {!data.top_consumed_items.length ? (
          <p className="text-sm text-slate-500">No stock consumption has been recorded for this month yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left">Item</th>
                <th className="px-4 py-2.5 text-left">Department</th>
                <th className="px-4 py-2.5 text-right">Consumed</th>
                <th className="px-4 py-2.5 text-right">Value (Ksh)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data.top_consumed_items.map(item => (
                <tr key={`${item.item}-${item.department}-${item.unit}`} className="hover:bg-white/[0.025] transition">
                  <td className="px-4 py-3 text-white">{item.item}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{item.department}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{item.consumed} {item.unit}</td>
                  <td className="px-4 py-3 text-right text-emerald-400">{Math.round(item.value).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

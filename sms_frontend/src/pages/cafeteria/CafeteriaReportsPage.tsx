import { BarChart3, TrendingUp, UtensilsCrossed, DollarSign, FileText, Users } from 'lucide-react'
import PageHero from '../../components/PageHero'

const DAILY_REVENUE = [
  { day: 'Mon', revenue: 18400, meals: 468 },
  { day: 'Tue', revenue: 19200, meals: 502 },
  { day: 'Wed', revenue: 17800, meals: 451 },
  { day: 'Thu', revenue: 20100, meals: 520 },
  { day: 'Fri', revenue: 16300, meals: 412 },
]
const maxRevenue = Math.max(...DAILY_REVENUE.map(d => d.revenue))

const MEAL_PLAN_DIST = [
  { type: 'Monthly Plan', count: 420, pct: 60 },
  { type: 'Weekly Plan', count: 140, pct: 20 },
  { type: 'Daily Plan', count: 70, pct: 10 },
  { type: 'Pay-as-you-eat', count: 70, pct: 10 },
]

const TOP_MEALS = [
  { meal: 'Rice + Beef Stew', served: 1820, revenue: 91000 },
  { meal: 'Ugali + Mboga', served: 1540, revenue: 61600 },
  { meal: 'Rice + Vegetable Curry', served: 1120, revenue: 50400 },
  { meal: 'Uji wa Mtama (Breakfast)', served: 960, revenue: 19200 },
  { meal: 'Mandazi + Tea', served: 840, revenue: 16800 },
]

const DIETARY_ALERTS = [
  { label: 'Nut Allergy', count: 14 },
  { label: 'Dairy-Free', count: 22 },
  { label: 'Vegetarian', count: 67 },
  { label: 'Halal Certified', count: 195 },
  { label: 'Gluten-Free', count: 8 },
]

export default function CafeteriaReportsPage() {
  const totalWeekRevenue = DAILY_REVENUE.reduce((s, d) => s + d.revenue, 0)
  const totalWeekMeals = DAILY_REVENUE.reduce((s, d) => s + d.meals, 0)
  const avgMealsDay = Math.round(totalWeekMeals / DAILY_REVENUE.length)

  return (
    <div className="space-y-6">
      <PageHero
        title="Cafeteria Reports & Analytics"
        subtitle="Financial performance, meal participation, and dietary compliance insights"
        icon={BarChart3}
        theme="emerald"
        stats={[
          { label: 'Week Revenue', value: `Ksh ${totalWeekRevenue.toLocaleString()}` },
          { label: 'Meals Served', value: totalWeekMeals.toLocaleString() },
          { label: 'Avg/Day', value: avgMealsDay },
          { label: 'Active Meal Plans', value: 700 },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { label: 'Daily Revenue (Avg)', value: `Ksh ${Math.round(totalWeekRevenue / DAILY_REVENUE.length).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', sub: 'This week' },
          { label: 'Meal Plans Active', value: '700 students', icon: Users, color: 'text-sky-400', sub: '92% of enrolled students' },
          { label: 'Meals Served Today', value: '468', icon: UtensilsCrossed, color: 'text-amber-400', sub: 'Breakfast + Lunch' },
        ].map(c => (
          <div key={c.label} className="glass-panel rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">{c.label}</p>
                <p className="mt-2 text-2xl font-bold font-display">{c.value}</p>
                <p className="mt-1 text-xs text-slate-500">{c.sub}</p>
              </div>
              <c.icon className={`mt-1 ${c.color}`} size={22} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-emerald-400" />
            <h3 className="font-display font-semibold text-sm">Daily Revenue — This Week (Ksh)</h3>
          </div>
          <div className="flex items-end gap-3 h-40">
            {DAILY_REVENUE.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-500">{Math.round(d.revenue / 1000)}k</span>
                <div
                  className="w-full rounded-t-lg bg-emerald-500/40 border border-emerald-500/30"
                  style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                />
                <span className="text-xs text-slate-400">{d.day}</span>
                <span className="text-[10px] text-slate-600">{d.meals}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-2 text-center">Bars represent revenue; numbers below are meals served</p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Users size={16} className="text-sky-400" />
            <h3 className="font-display font-semibold text-sm">Meal Plan Distribution</h3>
          </div>
          <div className="space-y-4">
            {MEAL_PLAN_DIST.map(p => (
              <div key={p.type}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">{p.type}</span>
                  <span className="text-slate-400">{p.count} students ({p.pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06]">
                  <div className="h-2 rounded-full bg-sky-500/50" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-amber-400" />
              <h3 className="font-display font-semibold text-sm">Top Meals — This Month</h3>
            </div>
            <button className="text-xs text-emerald-400 hover:text-emerald-300 transition">Export</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Meal</th>
                <th className="px-3 py-2 text-right">Served</th>
                <th className="px-3 py-2 text-right">Revenue (Ksh)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {TOP_MEALS.map((m, i) => (
                <tr key={i} className="hover:bg-white/[0.025] transition">
                  <td className="px-3 py-2.5 text-white">{m.meal}</td>
                  <td className="px-3 py-2.5 text-right text-slate-300">{m.served.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-400">{m.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <UtensilsCrossed size={16} className="text-rose-400" />
            <h3 className="font-display font-semibold text-sm">Dietary & Allergy Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DIETARY_ALERTS.map(d => (
              <div key={d.label} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                <p className="text-2xl font-bold text-white">{d.count}</p>
                <p className="text-xs text-slate-400 mt-1">{d.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-4">Based on registered dietary profiles in Dietary & Allergy Management.</p>
        </div>
      </div>
    </div>
  )
}

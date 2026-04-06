import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cafeteriaApi } from '../../api/sports_cafeteria'
import PageHero from '../../components/PageHero'
import {
  Utensils, Users, ClipboardList, Wallet, ChevronRight,
  Coffee, Sun, Moon, Star, TrendingUp, CheckCircle2, Clock,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const WEEKLY_MENU = [
  {
    day: 'Mon', date: '10',
    breakfast: 'Uji wa Mtama · Bread · Tea',
    lunch: 'Rice & Beef Stew · Kachumbari',
    supper: 'Githeri · Avocado',
  },
  {
    day: 'Tue', date: '11',
    breakfast: 'Porridge · Eggs · Chapati',
    lunch: 'Ugali · Sukuma Wiki · Beef',
    supper: 'Ugali · Beans · Cabbage',
  },
  {
    day: 'Wed', date: '12',
    breakfast: 'Mahamri · Tea · Banana',
    lunch: 'Pilau · Kachumbari · Salad',
    supper: 'Rice · Fish · Spinach',
  },
  {
    day: 'Thu', date: '13',
    breakfast: 'Bread · Butter · Tea',
    lunch: 'Ugali · Fried Chicken · Coleslaw',
    supper: 'Matoke · Beef Stew',
  },
  {
    day: 'Fri', date: '14',
    breakfast: 'Porridge · Mandazi',
    lunch: 'Biryani · Raita · Juice',
    supper: 'Chapati · Lentil Soup',
  },
]

const PLANS = [
  { name: 'Full Board', desc: 'Breakfast + Lunch + Supper', price: 450, students: 18, color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  { name: 'Lunch Only', desc: 'Monday – Friday lunch', price: 180, students: 14, color: '#0ea5e9', bg: 'rgba(14,165,233,0.10)' },
  { name: 'Breakfast & Lunch', desc: 'Morning + Afternoon meals', price: 320, students: 8, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
]

function MealIcon({ meal }: { meal: 'breakfast' | 'lunch' | 'supper' }) {
  if (meal === 'breakfast') return <Coffee size={10} className="text-amber-400" />
  if (meal === 'lunch') return <Sun size={10} className="text-emerald-400" />
  return <Moon size={10} className="text-violet-400" />
}

export default function CafeteriaDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [today] = useState(1)

  useEffect(() => {
    cafeteriaApi.getDashboard()
      .then((data: any) => setStats(data))
      .catch(() => {})
  }, [])

  const kpis = [
    {
      label: 'Enrolled Students', value: stats?.enrolled_students ?? 40,
      icon: Users, color: '#10b981', bg: 'rgba(16,185,129,0.12)',
      sub: 'Active meal subscriptions',
    },
    {
      label: 'Meals Served Today', value: stats?.today_meal_count ?? 38,
      icon: Utensils, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',
      sub: 'Across all 3 sessions',
    },
    {
      label: 'Active Meal Plans', value: stats?.this_week_menu_count ?? 3,
      icon: ClipboardList, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',
      sub: 'Full Board · Lunch · B&L',
    },
    {
      label: 'Weekly Revenue', value: 'Ksh ' + (40 * 320).toLocaleString('en-KE'),
      icon: Wallet, color: '#a855f7', bg: 'rgba(168,85,247,0.12)',
      sub: 'All plans combined',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        badge="CAFETERIA"
        badgeColor="teal"
        title="Cafeteria Dashboard"
        subtitle="Meal plans, daily menus and student feeding overview"
        icon="🍽️"
      />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0f2027 0%, #1a3a2e 40%, #0d2b1a 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(ellipse at 75% 50%, rgba(16,185,129,0.45) 0%, transparent 60%), radial-gradient(ellipse at 15% 80%, rgba(245,158,11,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                CAFETERIA · TERM 1 2025
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Lunch service active
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              School Nutrition &<br />
              <span style={{ color: '#34d399' }}>Cafeteria Hub</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              Balanced Kenyan meals, digital meal tracking, and student nutrition management — all in one place.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
            {[
              { label: 'Served today', value: '38', icon: CheckCircle2, color: '#10b981' },
              { label: 'On Full Board', value: '18', icon: Star, color: '#f59e0b' },
              { label: 'Weekly menus', value: '1', icon: ClipboardList, color: '#0ea5e9' },
              { label: 'Meal plans', value: '3', icon: TrendingUp, color: '#a855f7' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <item.icon size={14} style={{ color: item.color }} className="mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{item.value}</p>
                <p className="text-[10px] text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label}
            className="rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
            style={{ background: `${k.color}10`, border: `1px solid ${k.color}25` }}>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-15"
              style={{ background: k.color, filter: 'blur(12px)' }} />
            <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums relative z-10">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium relative z-10">{k.label}</p>
            <p className="text-[10px] mt-1 font-medium relative z-10" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Weekly Menu + Meal Plans ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Weekly Menu */}
        <div className="xl:col-span-2 rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <ClipboardList size={13} className="text-emerald-400" />
              <p className="text-sm font-bold text-white">This Week's Menu — 10–14 March 2025</p>
            </div>
            <button onClick={() => navigate('/modules/cafeteria/menu')} className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition">
              Full menu →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest w-20">Day</th>
                  {(['breakfast', 'lunch', 'supper'] as const).map(m => (
                    <th key={m} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><MealIcon meal={m} />{m}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEEKLY_MENU.map((row, i) => (
                  <tr key={row.day}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{
                      borderBottom: i < WEEKLY_MENU.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                      background: i === today ? 'rgba(16,185,129,0.04)' : undefined,
                    }}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex flex-col items-center justify-center text-center ${i === today ? 'bg-emerald-500' : ''}`}
                          style={i !== today ? { background: 'rgba(255,255,255,0.06)' } : {}}>
                          <p className="text-[8px] text-slate-400 leading-none">{row.day}</p>
                          <p className={`text-sm font-bold leading-none ${i === today ? 'text-white' : 'text-white'}`}>{row.date}</p>
                        </div>
                        {i === today && <span className="text-[9px] text-emerald-400 font-bold">TODAY</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-slate-300">{row.breakfast}</td>
                    <td className="px-4 py-3.5 text-[11px] text-slate-300 font-medium">{row.lunch}</td>
                    <td className="px-4 py-3.5 text-[11px] text-slate-300">{row.supper}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar: Meal Plans + Quick Actions */}
        <div className="space-y-4">

          {/* Meal plans */}
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Star size={13} className="text-amber-400" /> Active Meal Plans
              </p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {PLANS.map(plan => (
                <div key={plan.name} className="px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{plan.name}</p>
                      <p className="text-[11px] text-slate-400">{plan.desc}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: plan.bg, color: plan.color }}>
                      {plan.students} students
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 h-1.5 rounded-full mr-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(plan.students / 40) * 100}%`, background: plan.color }} />
                    </div>
                    <p className="text-xs font-bold" style={{ color: plan.color }}>Ksh {plan.price}/day</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-4" style={GLASS}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'Manage Meal Plans', route: '/modules/cafeteria/plans', color: '#10b981' },
                { label: 'Weekly Menu Editor', route: '/modules/cafeteria/menu', color: '#0ea5e9' },
                { label: 'Student Enrollments', route: '/modules/cafeteria/enrollments', color: '#f59e0b' },
                { label: 'Meal Attendance Logs', route: '/modules/cafeteria/logs', color: '#a855f7' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.route)}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>{item.label}</span>
                  <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Today's highlight */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={13} className="text-emerald-400" />
              <p className="text-xs font-bold text-emerald-300">Today's Service Times</p>
            </div>
            {[
              { meal: 'Breakfast', time: '6:45 – 7:15 AM', icon: Coffee },
              { meal: 'Lunch', time: '12:30 – 1:30 PM', icon: Sun },
              { meal: 'Supper', time: '6:30 – 7:15 PM', icon: Moon },
            ].map(({ meal, time, icon: Icon }) => (
              <div key={meal} className="flex items-center justify-between py-1.5">
                <span className="flex items-center gap-1.5 text-xs text-slate-400"><Icon size={11} />{meal}</span>
                <span className="text-xs font-semibold text-white">{time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

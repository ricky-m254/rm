import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import {
  Bed, Users, Building, ChevronRight, CheckCircle2,
  AlertCircle, Clock, Moon, Sun, DoorOpen, Shield,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const DORM_COLORS = [
  { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
  { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  { color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  { color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
  { color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
]

interface DormSummary {
  id: number
  name: string
  total_beds: number
  occupied_beds: number
  available_beds: number
}

interface DashboardData {
  dormitory_summary: DormSummary[]
  tonight_attendance: Array<{ status: string; count: number }>
  total_active_allocations: number
}

function OccupancyRing({ pct, color }: { pct: number; color: string }) {
  const size = 100
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
      <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 50 50)" />
      <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fontWeight="700" fill="white">{pct.toFixed(0)}%</text>
      <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fontSize="9" fill="#94a3b8">occupied</text>
    </svg>
  )
}

function SkeletonBlock({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} rounded-lg bg-white/[0.04] animate-pulse`} />
}

export default function HostelDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<DashboardData>('/hostel/dashboard/')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const dorms = data?.dormitory_summary ?? []
  const totalBeds = dorms.reduce((s, d) => s + d.total_beds, 0)
  const occupiedBeds = dorms.reduce((s, d) => s + d.occupied_beds, 0)
  const availableBeds = totalBeds - occupiedBeds
  const occupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  const attendanceMap = (data?.tonight_attendance ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = a.count; return acc
  }, {})
  const presentCount = attendanceMap['Present'] ?? 0
  const absentCount = attendanceMap['Absent'] ?? 0
  const leaveCount = attendanceMap['On Leave'] ?? attendanceMap['Leave'] ?? 0
  const totalAttendance = presentCount + absentCount + leaveCount

  const kpis = [
    { label: 'Dormitories', value: dorms.length, icon: Building, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', sub: `${dorms.filter(d => d.name.toLowerCase().includes('boy') || d.name.toLowerCase().includes('male')).length} Boys · ${dorms.filter(d => d.name.toLowerCase().includes('girl') || d.name.toLowerCase().includes('female')).length} Girls` },
    { label: 'Total Beds', value: totalBeds, icon: Bed, color: '#10b981', bg: 'rgba(16,185,129,0.12)', sub: 'Across all wings' },
    { label: 'Occupied', value: occupiedBeds, icon: Users, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', sub: `${occupancy}% occupancy rate` },
    { label: 'Available', value: availableBeds, icon: DoorOpen, color: '#a855f7', bg: 'rgba(168,85,247,0.12)', sub: 'Ready for allocation' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0b1120 0%, #111b2e 45%, #0a1a22 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 80% 50%, rgba(14,165,233,0.5) 0%, transparent 55%), radial-gradient(ellipse at 15% 75%, rgba(168,85,247,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(14,165,233,0.2)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.35)' }}>
                HOSTEL MANAGEMENT
              </span>
              {!loading && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {occupancy}% Occupancy
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Boarding House &<br />
              <span style={{ color: '#7dd3fc' }}>Hostel Control</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              {loading ? 'Loading hostel data…' : `${dorms.length} dormitory wing${dorms.length !== 1 ? 's' : ''}, ${totalBeds} bed spaces, real-time attendance, and secure student boarding management.`}
            </p>
          </div>
          <div className="flex items-center gap-6 justify-center lg:justify-end">
            {loading ? (
              <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center"
                style={{ background: 'rgba(14,165,233,0.06)', border: '2px solid rgba(14,165,233,0.15)' }}>
                <div className="w-12 h-12 rounded-full bg-white/[0.04] animate-pulse" />
              </div>
            ) : (
              <OccupancyRing pct={occupancy} color="#0ea5e9" />
            )}
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  <SkeletonBlock w="w-32" h="h-3" />
                  <SkeletonBlock w="w-28" h="h-3" />
                  <SkeletonBlock w="w-24" h="h-3" />
                </div>
              ) : (
                [
                  { label: 'Present tonight', value: presentCount, color: '#10b981', icon: CheckCircle2 },
                  { label: 'Absent', value: absentCount, color: '#ef4444', icon: AlertCircle },
                  { label: 'On Leave', value: leaveCount, color: '#f59e0b', icon: Moon },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon size={12} style={{ color }} />
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-xs font-bold text-white ml-auto">{value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <SkeletonBlock w="w-10" h="h-8" />
              <SkeletonBlock w="w-24" h="h-3" />
              <SkeletonBlock w="w-32" h="h-2" />
            </div>
          ))
          : kpis.map(k => (
            <div key={k.label}
              className="rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
              style={{ background: `${k.color}10`, border: `1px solid ${k.color}25` }}>
              <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-15"
                style={{ background: k.color, filter: 'blur(12px)' }} />
              <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
                <k.icon size={16} style={{ color: k.color }} />
              </div>
              <p className="text-3xl font-bold text-white tabular-nums relative z-10">{k.value}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium relative z-10">{k.label}</p>
              <p className="text-[10px] mt-1 font-medium relative z-10" style={{ color: k.color }}>{k.sub}</p>
            </div>
          ))
        }
      </div>

      {/* ── Dormitories + Attendance + Actions ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Dormitory status */}
        <div className="xl:col-span-2 rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Building size={13} className="text-sky-400" /> Dormitory Status
            </p>
            <button onClick={() => navigate('/modules/hostel/dormitories')}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-medium transition">
              Manage →
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <SkeletonBlock w="w-3/4" h="h-4" />
                  <SkeletonBlock w="w-1/2" h="h-3" />
                  <SkeletonBlock h="h-2" />
                </div>
              ))
              : dorms.length === 0
                ? (
                  <div className="col-span-2 py-10 text-center">
                    <Shield size={32} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No dormitories configured yet.</p>
                    <button onClick={() => navigate('/modules/hostel/dormitories')}
                      className="mt-3 rounded-xl px-4 py-2 text-xs font-semibold text-sky-300 transition hover:opacity-80"
                      style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                      Add Dormitories →
                    </button>
                  </div>
                )
                : dorms.map((dorm, idx) => {
                  const { color, bg } = DORM_COLORS[idx % DORM_COLORS.length]
                  const pct = dorm.total_beds > 0 ? Math.round((dorm.occupied_beds / dorm.total_beds) * 100) : 0
                  return (
                    <div key={dorm.id} className="rounded-2xl p-4"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{dorm.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{dorm.total_beds} beds</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: bg, color }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="text-xs font-bold text-white">{dorm.occupied_beds}/{dorm.total_beds}</span>
                      </div>
                      <div className="flex gap-3 text-[10px] text-slate-500">
                        <span style={{ color }}>{dorm.occupied_beds} occupied</span>
                        <span>·</span>
                        <span>{dorm.available_beds} free</span>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Tonight's attendance */}
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Moon size={13} className="text-violet-400" /> Tonight's Roll Call
              </p>
            </div>
            <div className="p-4 space-y-3">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} h="h-6" />)
                : [
                  { label: 'Present', value: presentCount, color: '#10b981', icon: CheckCircle2 },
                  { label: 'Absent', value: absentCount, color: '#ef4444', icon: AlertCircle },
                  { label: 'On Leave', value: leaveCount, color: '#f59e0b', icon: Moon },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Icon size={11} style={{ color }} />{label}
                      </span>
                      <span className="text-xs font-bold text-white">{value}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${(value / (totalAttendance || 1)) * 100}%`, background: color }} />
                    </div>
                  </div>
                ))
              }
              {!loading && (
                <div className="pt-1 text-center">
                  <span className="text-[10px] text-slate-500">
                    {presentCount} / {totalAttendance || data?.total_active_allocations || 0} students accounted for
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Service times */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.18)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} className="text-sky-400" />
              <p className="text-xs font-bold text-sky-300">Daily Hostel Schedule</p>
            </div>
            {[
              { label: 'Morning Roll Call', time: '5:45 AM', icon: Sun },
              { label: 'Breakfast', time: '6:30 AM', icon: Sun },
              { label: 'Evening Roll Call', time: '6:30 PM', icon: Moon },
              { label: 'Night Roll Call', time: '9:00 PM', icon: Moon },
              { label: 'Lights Out', time: '10:00 PM', icon: Moon },
            ].map(({ label, time, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="flex items-center gap-1.5 text-xs text-slate-400"><Icon size={10} />{label}</span>
                <span className="text-xs font-semibold text-white">{time}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-4" style={GLASS}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'Take Attendance', route: '/modules/hostel/attendance', color: '#10b981' },
                { label: 'New Allocation', route: '/modules/hostel/allocations', color: '#0ea5e9' },
                { label: 'Manage Dormitories', route: '/modules/hostel/dormitories', color: '#a855f7' },
                { label: 'Hostel Leave Requests', route: '/modules/hostel/leave', color: '#f59e0b' },
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
        </div>
      </div>
    </div>
  )
}

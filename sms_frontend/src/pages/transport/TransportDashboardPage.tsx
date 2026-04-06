import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../../api/client'
import {
  Bus, MapPin, Users, AlertTriangle, Navigation,
  RefreshCw, RadioTower, Fuel, CheckCircle2, Loader2, Sprout,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { isAdminFamilyRole } from '../../lib/roleCatalog'
import { useAuthStore } from '../../store/auth'

interface Vehicle {
  id: number
  registration: string
  make: string
  model: string
  capacity: number
  status: string
  notes: string
}

interface RouteStop {
  id: number
  stop_name: string
  sequence: number
  estimated_time: string
}

interface Route {
  id: number
  name: string
  direction: string
  is_active: boolean
  vehicle: number | null
  stops?: RouteStop[]
}

interface Stats {
  total_vehicles: number
  active_routes: number
  students_enrolled: number
  incidents_open: number
}

const V_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  Active:      { label: 'Active',       color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  Maintenance: { label: 'Maintenance',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  Retired:     { label: 'Retired',      color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

const ROUTE_COLORS = ['#10b981', '#a78bfa', '#38bdf8', '#f59e0b', '#ec4899', '#0ea5e9']

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v?.results) ? v.results : []
}

export default function TransportDashboardPage() {
  const [stats, setStats]           = useState<Stats | null>(null)
  const [vehicles, setVehicles]     = useState<Vehicle[]>([])
  const [routes, setRoutes]         = useState<Route[]>([])
  const [loading, setLoading]       = useState(true)
  const [seeding, setSeeding]       = useState(false)
  const [seedMsg, setSeedMsg]       = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const navigate = useNavigate()
  const role = useAuthStore(s => s.role)
  const canSeedTransport = isAdminFamilyRole(role)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, vehiclesRes, routesRes] = await Promise.allSettled([
        apiClient.get<Stats>('/transport/dashboard/'),
        apiClient.get<Vehicle[] | { results: Vehicle[] }>('/transport/vehicles/'),
        apiClient.get<Route[] | { results: Route[] }>('/transport/routes/'),
      ])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (vehiclesRes.status === 'fulfilled') setVehicles(asArray(vehiclesRes.value.data))
      if (routesRes.status === 'fulfilled')   setRoutes(asArray(routesRes.value.data))
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  const seedTransport = async () => {
    setSeeding(true)
    setSeedMsg(null)
    try {
      await apiClient.post('/transport/seed/')
      setSeedMsg('Sample transport data seeded successfully!')
      await loadAll()
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSeedMsg(msg ?? 'Seeding failed. Please try again.')
    } finally {
      setSeeding(false)
    }
  }

  const isEmpty = !loading && vehicles.length === 0 && routes.length === 0

  return (
    <div className="p-6 space-y-6">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #050f1a 0%, #0b1b2e 45%, #0a1520 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 80% 40%, rgba(56,189,248,0.5) 0%, transparent 55%), radial-gradient(ellipse at 15% 70%, rgba(16,185,129,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(56,189,248,0.18)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.3)' }}>
                TRANSPORT & FLEET
              </span>
              {!loading && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live · {lastRefresh.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Fleet Control &amp;<br />
              <span style={{ color: '#7dd3fc' }}>Live Tracking</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              {loading
                ? 'Loading fleet data…'
                : `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}, ${routes.filter(r => r.is_active).length} active route${routes.filter(r => r.is_active).length !== 1 ? 's' : ''}, and parent notification portal.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-2 gap-3 lg:min-w-[220px]">
              {[
                { label: 'Active',      value: loading ? '—' : `${vehicles.filter(v => v.status === 'Active').length}`,      color: '#10b981' },
                { label: 'Routes',      value: loading ? '—' : `${routes.filter(r => r.is_active).length}`,                  color: '#38bdf8' },
                { label: 'Students',    value: loading ? '—' : `${stats?.students_enrolled ?? 0}`,                           color: '#a78bfa' },
                { label: 'Incidents',   value: loading ? '—' : `${stats?.incidents_open ?? 0}`,                              color: '#f59e0b' },
              ].map(item => (
                <div key={item.label} className="rounded-2xl px-4 py-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-[10px] text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
            <button onClick={() => void loadAll()} disabled={loading}
              className="rounded-xl p-3 text-slate-400 hover:text-white transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Seed prompt when empty ── */}
      {isEmpty && (
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <Sprout size={22} className="text-emerald-400" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-white mb-1">No transport data yet</p>
            <p className="text-[12px] text-slate-400">
              {canSeedTransport
                ? 'Seed sample Kenyan school fleet data (4 buses + 4 Nairobi routes) to get started instantly, or add vehicles and routes manually.'
                : 'Add vehicles and routes manually, or ask a school administrator to seed sample transport data.'}
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button onClick={() => navigate('/modules/transport/vehicles')}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-200 transition hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Add Manually
            </button>
            {canSeedTransport && (
              <button onClick={() => void seedTransport()} disabled={seeding}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              {seeding ? <><Loader2 size={12} className="animate-spin" /> Seeding…</> : <><Sprout size={12} /> Seed Sample Data</>}
              </button>
            )}
          </div>
        </div>
      )}

      {seedMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${seedMsg.includes('success') ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}
          style={{ border: seedMsg.includes('success') ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)' }}>
          {seedMsg}
        </div>
      )}

      {/* ── KPI Cards ── */}
      {!isEmpty && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Fleet Size',          value: stats?.total_vehicles   ?? vehicles.length,                   icon: Bus,           color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   sub: `${vehicles.filter(v => v.status === 'Active').length} operational` },
            { label: 'Active Routes',       value: stats?.active_routes    ?? routes.filter(r => r.is_active).length, icon: Navigation, color: '#10b981', bg: 'rgba(16,185,129,0.1)',   sub: 'All routes live' },
            { label: 'Students in Transit', value: stats?.students_enrolled ?? 0,                                icon: Users,         color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  sub: 'Assigned this term' },
            { label: 'Open Incidents',      value: stats?.incidents_open   ?? 0,                                icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   sub: 'Requiring action' },
          ].map(k => (
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
          ))}
        </div>
      )}

      {/* ── Map + Fleet ── */}
      {!isEmpty && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Map */}
          <div className="xl:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2">
                <RadioTower size={14} className="text-emerald-400" />
                <span className="text-sm font-bold text-white">Live Fleet Map — Nairobi, Kenya</span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-[10px]">
                {Object.values(V_STATUS).map(v => (
                  <div key={v.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: v.color }} />
                    <span className="text-slate-500">{v.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative" style={{ height: 380 }}>
              <iframe
                title="Nairobi Transport Map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=36.700%2C-1.370%2C36.920%2C-1.220&layer=mapnik"
                className="w-full h-full"
                style={{ border: 'none', filter: 'invert(0.88) hue-rotate(185deg) saturate(0.6) brightness(0.7)' }}
                loading="lazy"
              />
              <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                {vehicles.map(v => {
                  const cfg = V_STATUS[v.status] ?? V_STATUS.Active
                  return (
                    <div key={v.id}
                      className="rounded-xl px-3 py-1.5 text-[11px] font-bold flex items-center gap-2 backdrop-blur-md pointer-events-auto cursor-pointer hover:scale-105 transition-transform"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.color}50`, color: cfg.color }}
                      onClick={() => setSelectedId(selectedId === v.id ? null : v.id)}>
                      <div className="w-2 h-2 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                      <span className="font-mono">{v.registration}</span>
                      <span className="text-[10px] opacity-70">{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Fleet Status */}
          <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Bus size={14} className="text-sky-400" /> Fleet Status
              </p>
              <button onClick={() => navigate('/modules/transport/vehicles')}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-medium transition">+ Add</button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
              {vehicles.length === 0
                ? <p className="p-6 text-sm text-center text-slate-500">No vehicles added yet.</p>
                : vehicles.map(v => {
                  const cfg = V_STATUS[v.status] ?? V_STATUS.Active
                  const open = selectedId === v.id
                  const pct = Math.round((v.capacity * 0.7))
                  return (
                    <div key={v.id}
                      className="p-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onClick={() => setSelectedId(open ? null : v.id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white font-mono">{v.registration}</span>
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: cfg.bg, color: cfg.color }}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{[v.make, v.model].filter(Boolean).join(' ') || '—'}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{v.capacity} seat capacity</p>
                        </div>
                      </div>
                      <div className="mt-2.5 rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: cfg.color }} />
                      </div>
                      {open && (
                        <div className="mt-3 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <p className="text-xs font-bold text-white">{v.capacity}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5 flex items-center justify-center gap-0.5"><Users size={8} />Capacity</p>
                          </div>
                          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <p className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">Status</p>
                          </div>
                          {v.notes && (
                            <div className="col-span-2 rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <p className="text-[10px] text-slate-400">{v.notes}</p>
                            </div>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); navigate('/modules/transport/vehicles') }}
                            className="col-span-2 rounded-xl py-1.5 text-[11px] font-bold transition hover:opacity-80 flex items-center justify-center gap-1.5"
                            style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>
                            <Fuel size={10} /> View Details
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Routes + Sidebar ── */}
      {!isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Routes table */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white flex items-center gap-2"><Navigation size={13} className="text-violet-400" /> Route Schedules</p>
              <button onClick={() => navigate('/modules/transport/routes')} className="text-[11px] text-violet-400 hover:text-violet-300 font-medium transition">Manage →</button>
            </div>
            {routes.length === 0
              ? (
                <div className="py-10 text-center">
                  <Navigation size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No routes configured yet.</p>
                  <button onClick={() => navigate('/modules/transport/routes')}
                    className="mt-3 rounded-xl px-4 py-2 text-xs font-semibold text-violet-300 transition hover:opacity-80"
                    style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    Add Routes →
                  </button>
                </div>
              )
              : (
                <div className="divide-y divide-white/[0.04]">
                  {routes.map((r, i) => {
                    const color = ROUTE_COLORS[i % ROUTE_COLORS.length]
                    const stops = r.stops ?? []
                    return (
                      <div key={r.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white">{r.name}</p>
                            {!r.is_active && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">Inactive</span>
                            )}
                          </div>
                          {stops.length > 0 ? (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {stops.map((s, j) => (
                                <span key={j} className="flex items-center gap-0.5 text-[10px] text-slate-500">
                                  {j > 0 && <span className="text-slate-700 mx-0.5">›</span>}
                                  <MapPin size={7} className="opacity-50" />{s.stop_name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-500 mt-1">{r.direction} route</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right space-y-0.5">
                          <span className="text-[10px] font-bold" style={{ color }}>{r.direction}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Parent Portal CTA */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(14,165,233,0.06))', border: '1px solid rgba(16,185,129,0.18)' }}>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-emerald-400" />
                <p className="text-sm font-bold text-white">Parent Tracking Portal</p>
              </div>
              <p className="text-[12px] text-slate-400 mb-4 leading-relaxed">
                Parents can track their child's bus live, set home pin, and receive ETA push notifications.
              </p>
              <button onClick={() => navigate('/modules/parent-portal/dashboard')}
                className="w-full rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(90deg, #10b981, #0ea5e9)' }}>
                Open Parent Portal
              </button>
            </div>

            {/* Seed button (always visible as secondary) */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
              <div className="space-y-2">
                {[
                  { label: 'Manage Vehicles',     icon: Bus,           route: '/modules/transport/vehicles'  },
                  { label: 'Route Management',     icon: Navigation,    route: '/modules/transport/routes'    },
                  { label: 'Student Assignments',  icon: Users,         route: '/modules/transport/students'  },
                  { label: 'Incident Reports',     icon: AlertTriangle, route: '/modules/transport/incidents' },
                ].map(item => (
                  <button key={item.label} onClick={() => navigate(item.route)}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition group"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <item.icon size={12} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    {item.label}
                  </button>
                ))}
                {canSeedTransport && (
                  <button onClick={() => void seedTransport()} disabled={seeding}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition group disabled:opacity-50"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981' }}>
                  {seeding ? <Loader2 size={12} className="animate-spin" /> : <Sprout size={12} />}
                  {seeding ? 'Seeding…' : 'Re-seed Sample Data'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arrival indicator (only when we have data) */}
      {!isEmpty && vehicles.some(v => v.status === 'Active') && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
          <CheckCircle2 size={18} className="text-sky-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-sky-300">Fleet Active</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {vehicles.filter(v => v.status === 'Active').length} vehicle{vehicles.filter(v => v.status === 'Active').length !== 1 ? 's' : ''} operational · {stats?.students_enrolled ?? 0} students enrolled in transport
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

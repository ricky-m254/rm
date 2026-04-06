import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { Bus, MapPin, User, Clock, Route, CheckCircle2, AlertTriangle } from 'lucide-react'

interface TransportAssignment {
  id: number
  route_name: string
  route_direction: string
  boarding_stop: string | null
  boarding_time: string | null
  vehicle_registration: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_capacity: number | null
  driver_name: string | null
  driver_phone: string | null
}

interface RouteStop {
  id: number
  stop_name: string
  sequence: number
  estimated_time: string
  landmark: string
}

interface TransportData {
  child_name: string
  child_id: number
  assignment: TransportAssignment | null
  route_stops: RouteStop[]
  children: { id: number; name: string }[]
}

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const DIRECTION_MAP: Record<string, string> = {
  MORNING: 'Morning Pick-Up',
  EVENING: 'Evening Drop-Off',
  BOTH: 'Morning & Evening',
}

export default function ParentPortalTransportPage() {
  const [data, setData] = useState<TransportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState<number | null>(null)

  const load = async (childId?: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = childId ? { child_id: childId } : {}
      const res = await apiClient.get<TransportData>('/parent-portal/transport/', { params })
      setData(res.data)
    } catch (err) {
      const apiErr = err as { response?: { data?: { error?: string; detail?: string } } }
      const msg = apiErr?.response?.data?.error ?? apiErr?.response?.data?.detail ?? null
      setError(msg ?? 'Unable to load transport information.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleChildSwitch = (childId: number) => {
    setSelectedChild(childId)
    void load(childId)
  }

  const a = data?.assignment

  return (
    <div className="space-y-6">
      <PageHero
        badge="TRANSPORT"
        badgeColor="sky"
        title="Transport & Routes"
        subtitle="View your child's assigned bus route, boarding stop, and driver contact details."
        icon="🚌"
      />

      {/* Child selector */}
      {data && data.children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {data.children.map(c => (
            <button key={c.id} onClick={() => handleChildSwitch(c.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
                (selectedChild ?? data.child_id) === c.id
                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                  : 'border-white/[0.09] text-slate-300 hover:border-white/20'
              }`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-slate-400">Loading transport information…</div>
      )}

      {!loading && data && (
        <>
          {!a ? (
            <div className="rounded-2xl p-12 text-center" style={GLASS}>
              <Bus size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="font-semibold text-slate-300">No transport assignment found</p>
              <p className="text-sm text-slate-500 mt-2">
                {data.child_name} has not been assigned to a school bus route for the current term.
              </p>
              <p className="text-xs text-slate-600 mt-3">Contact the school transport office to arrange pickup.</p>
            </div>
          ) : (
            <>
              {/* Vehicle & Driver Card */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Bus Info */}
                <div className="rounded-2xl p-6" style={GLASS}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(14,165,233,0.15)' }}>
                      <Bus size={20} className="text-sky-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-100">Vehicle Details</h2>
                      <p className="text-xs text-slate-400">Assigned school bus</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Registration</span>
                      <span className="font-mono font-bold text-sky-300 text-lg">
                        {a.vehicle_registration ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Make / Model</span>
                      <span className="text-sm text-slate-200">
                        {[a.vehicle_make, a.vehicle_model].filter(Boolean).join(' ') || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Capacity</span>
                      <span className="text-sm text-slate-200">{a.vehicle_capacity ? `${a.vehicle_capacity} seats` : '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Driver Info */}
                <div className="rounded-2xl p-6" style={GLASS}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(168,85,247,0.15)' }}>
                      <User size={20} className="text-violet-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-100">Driver Details</h2>
                      <p className="text-xs text-slate-400">Contact in emergencies</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Driver Name</span>
                      <span className="text-sm text-slate-200">{a.driver_name ?? 'Not assigned'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Phone</span>
                      {a.driver_phone ? (
                        <a href={`tel:${a.driver_phone}`}
                          className="text-sm font-mono text-violet-300 hover:text-violet-200 transition">
                          {a.driver_phone}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Route & Boarding */}
              <div className="rounded-2xl p-6" style={GLASS}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(16,185,129,0.15)' }}>
                    <Route size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-100">{a.route_name}</h2>
                    <p className="text-xs text-slate-400">{DIRECTION_MAP[a.route_direction] ?? a.route_direction}</p>
                  </div>
                </div>

                {/* Boarding stop highlight */}
                {a.boarding_stop && (
                  <div className="rounded-xl p-4 mb-4 border border-emerald-400/20 bg-emerald-400/5">
                    <div className="flex items-center gap-3">
                      <MapPin size={18} className="text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Your Boarding Stop</p>
                        <p className="font-bold text-white mt-0.5">{a.boarding_stop}</p>
                        {a.boarding_time && (
                          <p className="text-xs text-emerald-300 mt-0.5 flex items-center gap-1">
                            <Clock size={11} /> Estimated: {a.boarding_time}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* All route stops */}
                {data.route_stops.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">All Route Stops</p>
                    <div className="space-y-0">
                      {data.route_stops.map((stop, idx) => {
                        const isBoarding = stop.stop_name === a.boarding_stop
                        const isFirst = idx === 0
                        const isLast = idx === data.route_stops.length - 1
                        return (
                          <div key={stop.id} className="flex gap-4">
                            {/* Timeline line */}
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${isBoarding ? 'bg-emerald-400 ring-4 ring-emerald-400/20' : 'bg-slate-600'}`} />
                              {!isLast && <div className="w-0.5 flex-1 bg-slate-700 my-0.5 min-h-4" />}
                            </div>
                            <div className={`pb-3 flex-1 ${isFirst ? 'pt-0' : ''}`}>
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold ${isBoarding ? 'text-emerald-300' : 'text-slate-200'}`}>
                                  {stop.stop_name}
                                  {isBoarding && (
                                    <span className="ml-2 text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-1.5 py-0.5 rounded-full">
                                      YOUR STOP
                                    </span>
                                  )}
                                </p>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {stop.estimated_time && <span className="mr-2"><Clock size={10} className="inline mr-0.5" />{stop.estimated_time}</span>}
                                {stop.landmark && <span>{stop.landmark}</span>}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Safety notice */}
              <div className="rounded-2xl px-6 py-4 flex items-center gap-4"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <AlertTriangle size={20} className="text-amber-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-100 text-sm">Transport Safety Reminder</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Students must be at the boarding stop 5 minutes before the estimated pickup time. Contact the school office for any changes to your child's transport arrangement.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl px-6 py-4 flex items-center gap-4"
                style={GLASS}>
                <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-slate-300">
                  Route tracking and live GPS updates are available through the school mobile app.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

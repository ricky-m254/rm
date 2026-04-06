import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { Heart, Syringe, Stethoscope, AlertTriangle, Activity, User } from 'lucide-react'

interface MedicalRecord {
  id: number
  blood_type: string
  allergies: string
  chronic_conditions: string
  disability: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

interface Immunization {
  id: number
  vaccine_name: string
  date_administered: string
  dose_number: number
  administered_by: string
  notes: string
  next_due_date: string | null
}

interface ClinicVisit {
  id: number
  visit_date: string
  complaint: string
  diagnosis: string
  treatment: string
  referred_to_hospital: boolean
  notes: string
}

interface HealthData {
  child_name: string
  child_id: number
  medical_record: MedicalRecord | null
  immunizations: Immunization[]
  clinic_visits: ClinicVisit[]
  children: { id: number; name: string }[]
}

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

export default function ParentPortalHealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState<number | null>(null)

  const load = async (childId?: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = childId ? { child_id: childId } : {}
      const res = await apiClient.get<HealthData>('/parent-portal/health/', { params })
      setData(res.data)
    } catch (err) {
      const apiErr = err as { response?: { data?: { error?: string; detail?: string } } }
      const msg = apiErr?.response?.data?.error ?? apiErr?.response?.data?.detail ?? null
      setError(msg ?? 'Unable to load health information.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleChildSwitch = (childId: number) => {
    setSelectedChild(childId)
    void load(childId)
  }

  const mr = data?.medical_record

  return (
    <div className="space-y-6">
      <PageHero
        badge="HEALTH"
        badgeColor="rose"
        title="Health & Medical"
        subtitle="View your child's medical records, immunization history, and clinic visits."
        icon="🏥"
      />

      {/* Child selector */}
      {data && data.children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {data.children.map(c => (
            <button key={c.id} onClick={() => handleChildSwitch(c.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
                (selectedChild ?? data.child_id) === c.id
                  ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
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
        <div className="text-center py-12 text-slate-400">Loading health records…</div>
      )}

      {!loading && data && (
        <>
          {/* Medical Profile */}
          <div className="rounded-2xl p-6" style={GLASS}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.15)' }}>
                <Heart size={20} className="text-rose-400" />
              </div>
              <div>
                <h2 className="font-bold text-slate-100">Medical Profile</h2>
                <p className="text-xs text-slate-400">{data.child_name}</p>
              </div>
            </div>

            {mr ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Blood Type</p>
                  <p className="text-2xl font-bold text-rose-400">{mr.blood_type || '—'}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Allergies</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{mr.allergies || 'None recorded'}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Chronic Conditions</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{mr.chronic_conditions || 'None recorded'}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Disability / Special Needs</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{mr.disability || 'None recorded'}</p>
                </div>
                {(mr.emergency_contact_name || mr.emergency_contact_phone) && (
                  <div className="sm:col-span-2 rounded-xl p-4 border border-amber-400/20 bg-amber-400/5">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <AlertTriangle size={13} /> Emergency Contact
                    </p>
                    <p className="text-sm text-slate-200">{mr.emergency_contact_name}</p>
                    <p className="text-sm text-amber-300 font-mono">{mr.emergency_contact_phone}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl p-6 text-center border border-dashed border-white/[0.07]">
                <User size={32} className="mx-auto mb-2 text-slate-600" />
                <p className="text-sm text-slate-400">No medical profile on record.</p>
                <p className="text-xs text-slate-600 mt-1">Please contact the school nurse to update medical information.</p>
              </div>
            )}
          </div>

          {/* Immunizations */}
          <div className="rounded-2xl p-6" style={GLASS}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <Syringe size={20} className="text-emerald-400" />
              </div>
              <h2 className="font-bold text-slate-100">Immunization Record</h2>
              <span className="ml-auto text-xs text-slate-500">{data.immunizations.length} vaccines on file</span>
            </div>

            {data.immunizations.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No immunization records found.</p>
            ) : (
              <div className="space-y-2">
                {data.immunizations.map(imm => (
                  <div key={imm.id} className="flex items-center gap-4 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <Syringe size={14} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-100 text-sm">{imm.vaccine_name}</p>
                      <p className="text-xs text-slate-400">
                        Dose {imm.dose_number} · {imm.date_administered}
                        {imm.administered_by && ` · ${imm.administered_by}`}
                      </p>
                    </div>
                    {imm.next_due_date && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-500">Next due</p>
                        <p className="text-xs font-semibold text-amber-400">{imm.next_due_date}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clinic Visits */}
          <div className="rounded-2xl p-6" style={GLASS}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.15)' }}>
                <Stethoscope size={20} className="text-sky-400" />
              </div>
              <h2 className="font-bold text-slate-100">Clinic / Nurse Visits</h2>
              <span className="ml-auto text-xs text-slate-500">{data.clinic_visits.length} visits on record</span>
            </div>

            {data.clinic_visits.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No clinic visits recorded.</p>
            ) : (
              <div className="space-y-3">
                {data.clinic_visits.map(visit => (
                  <div key={visit.id} className="rounded-xl p-4 space-y-2"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-100 text-sm">{visit.visit_date}</p>
                      {visit.referred_to_hospital && (
                        <span className="text-xs font-semibold text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2 py-0.5 rounded-full">
                          Hospital Referral
                        </span>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2 text-xs text-slate-400">
                      <div>
                        <span className="text-slate-500">Complaint: </span>
                        <span className="text-slate-300">{visit.complaint || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Diagnosis: </span>
                        <span className="text-slate-300">{visit.diagnosis || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Treatment: </span>
                        <span className="text-slate-300">{visit.treatment || '—'}</span>
                      </div>
                    </div>
                    {visit.notes && <p className="text-xs text-slate-500 italic">{visit.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Health Summary Banner */}
          <div className="rounded-2xl px-6 py-5 flex items-center gap-4"
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(14,165,233,0.06) 100%)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <Activity size={28} className="text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-100">School Health Programme</p>
              <p className="text-xs text-slate-400 mt-0.5">
                For urgent medical concerns, contact the school nurse directly. All medical information is kept confidential.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

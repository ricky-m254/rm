import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import {
  X, User, BookOpen, Users, CheckCircle2,
  ArrowRight, ArrowLeft, Camera, AlertTriangle, Loader2,
  ChevronRight, UserCheck,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const INPUT_STYLE = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
}

const STEPS = [
  { id: 1, label: 'Personal',   icon: User      },
  { id: 2, label: 'Academic',   icon: BookOpen   },
  { id: 3, label: 'Guardian',   icon: Users      },
  { id: 4, label: 'Review',     icon: CheckCircle2 },
]

const RELATIONSHIPS = ['Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Grandparent', 'Sibling', 'Other']
const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
]
const BLOOD_GROUPS  = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'Unknown']

type Classes = { id: number; display_name: string }[]

interface Props {
  classes: Classes
  onClose:   () => void
  onSuccess: (admissionNumber: string, studentId: number) => void
}

interface S1 { first_name: string; last_name: string; gender: string; date_of_birth: string; blood_group: string; nationality: string; religion: string; photo: File | null; photoPreview: string }
interface S2 { phone: string; email: string; address: string; school_class: string; enrollment_date: string; custom_admission: string }
interface S3 { skip: boolean; name: string; relationship: string; phone: string; email: string }
interface Created { id: number; admission_number: string; loginCreated: boolean; loginUsername: string }
interface TermOption { id: number; is_current: boolean; is_active: boolean }

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-[0.1em]">
      {children}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
  )
}

function Input({ value, onChange, placeholder, type = 'text', required, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean; className?: string
}) {
  return (
    <input
      type={type}
      required={required}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-slate-600 outline-none transition-all duration-200 ${className}`}
      style={INPUT_STYLE}
      onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; e.target.style.background = 'rgba(16,185,129,0.04)' }}
      onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
    />
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] | { value: string; label: string }[] }) {
  const normalized = (options as (string | { value: string; label: string })[]).map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  )
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white outline-none transition-all duration-200 appearance-none"
      style={INPUT_STYLE}
    >
      {normalized.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.05] last:border-0">
      <span className="text-[11px] text-slate-500 w-32 flex-shrink-0 pt-0.5 uppercase tracking-wide">{label}</span>
      <span className="text-[13px] text-slate-200 flex-1">{value}</span>
    </div>
  )
}

export default function AddStudentWizard({ classes, onClose, onSuccess }: Props) {
  const navigate = useNavigate()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Created | null>(null)
  const creatingLogin = false

  const [currentTermId, setCurrentTermId] = useState<number | null>(null)

  // Fetch the current active term on mount so enrollment can include term ID
  useEffect(() => {
    apiClient.get<TermOption[]>('/academics/ref/terms/', {
      params: { is_active: true },
    }).then(res => {
      const terms = res.data ?? []
      const current = terms.find(t => t.is_current) ?? terms.find(t => t.is_active) ?? terms[0]
      if (current) setCurrentTermId(current.id)
    }).catch(() => { /* term is optional for enrollment — proceed without it */ })
  }, [])

  const [s1, setS1] = useState<S1>({
    first_name: '', last_name: '', gender: 'M', date_of_birth: '',
    blood_group: '', nationality: 'Kenyan', religion: '', photo: null, photoPreview: '',
  })
  const [s2, setS2] = useState<S2>({
    phone: '', email: '', address: '', school_class: '',
    enrollment_date: new Date().toISOString().slice(0, 10), custom_admission: '',
  })
  const [s3, setS3] = useState<S3>({ skip: false, name: '', relationship: 'Father', phone: '', email: '' })

  const step1Valid = s1.first_name.trim().length >= 2 && s1.last_name.trim().length >= 1 && !!s1.gender && !!s1.date_of_birth

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setS1(s => ({ ...s, photo: file, photoPreview: URL.createObjectURL(file) }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      // Build payload — use JSON if no photo, FormData if photo attached
      let studentRes: { data: { id: number; admission_number: string } }
      if (s1.photo) {
        const fd = new FormData()
        fd.append('first_name',  s1.first_name.trim())
        fd.append('last_name',   s1.last_name.trim())
        fd.append('gender',      s1.gender)
        fd.append('is_active',   'true')
        if (s1.date_of_birth)    fd.append('date_of_birth', s1.date_of_birth)
        if (s2.phone)            fd.append('phone',         s2.phone.trim())
        if (s2.email)            fd.append('email',         s2.email.trim())
        if (s2.address)          fd.append('address',       s2.address.trim())
        if (s2.custom_admission) fd.append('admission_number', s2.custom_admission.trim())
        fd.append('photo', s1.photo)
        studentRes = await apiClient.post<{ id: number; admission_number: string }>('/students/', fd, {
          headers: { 'Content-Type': undefined as unknown as string },
        })
      } else {
        studentRes = await apiClient.post<{ id: number; admission_number: string }>('/students/', {
          first_name:       s1.first_name.trim(),
          last_name:        s1.last_name.trim(),
          gender:           s1.gender,
          is_active:        true,
          date_of_birth:    s1.date_of_birth || undefined,
          phone:            s2.phone.trim() || undefined,
          email:            s2.email.trim() || undefined,
          address:          s2.address.trim() || undefined,
          admission_number: s2.custom_admission.trim() || undefined,
        })
      }

      const studentId     = studentRes.data.id
      const admissionNumber = studentRes.data.admission_number

      if (s2.school_class) {
        try {
          const enrollPayload: Record<string, unknown> = {
            student:         studentId,
            school_class:    Number(s2.school_class),
            enrollment_date: s2.enrollment_date || new Date().toISOString().slice(0, 10),
            is_active:       true,
          }
          if (currentTermId) enrollPayload.term = currentTermId
          await apiClient.post('/academics/enrollments/', enrollPayload)
        } catch { /* enrollment is optional, non-blocking */ }
      }

      let loginCreated = false
      let loginUsername = admissionNumber
      try {
        const loginRes = await apiClient.post<{ created: boolean; username: string }>(
          `/students/${studentId}/create-login/`,
          { password: 'student123' },
        )
        loginCreated = loginRes.data.created
        loginUsername = loginRes.data.username
      } catch { /* login creation is optional */ }

      if (!s3.skip && s3.name.trim()) {
        try {
          await apiClient.post(`/students/${studentId}/guardians/`, {
            name:         s3.name.trim(),
            relationship: s3.relationship,
            phone:        s3.phone.trim(),
            email:        s3.email.trim(),
          })
        } catch { /* guardian is optional, non-blocking */ }
      }

      setCreated({ id: studentId, admission_number: admissionNumber, loginCreated, loginUsername })
      setStep(5)
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } }
      const data = e?.response?.data
      if (!data) {
        setError('Network error — check your connection and try again.')
        return
      }
      // Find first field-level error and surface it
      const fieldError = (key: string) => {
        const v = data[key]
        if (!v) return null
        return Array.isArray(v) ? String(v[0]) : String(v)
      }
      const msg =
        fieldError('first_name')   ??
        fieldError('last_name')    ??
        fieldError('date_of_birth') ??
        fieldError('gender')       ??
        fieldError('admission_number') ??
        fieldError('error')        ??
        fieldError('detail')       ??
        fieldError('non_field_errors') ??
        // Fall back to first key-value pair in the error body
        Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)[0] ??
        'Unable to create student. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewProfile = () => {
    if (created) {
      onClose()
      navigate(`/students/${created.id}`)
    }
  }

  const handleAddAnother = () => {
    setStep(1)
    setCreated(null)
    setError(null)
    setS1({ first_name: '', last_name: '', gender: 'M', date_of_birth: '', blood_group: '', nationality: 'Kenyan', religion: '', photo: null, photoPreview: '' })
    setS2({ phone: '', email: '', address: '', school_class: '', enrollment_date: new Date().toISOString().slice(0, 10), custom_admission: '' })
    setS3({ skip: false, name: '', relationship: 'Father', phone: '', email: '' })
    onSuccess(created!.admission_number, created!.id)
  }

  const selectedClassName = classes.find(c => String(c.id) === s2.school_class)?.display_name ?? '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,8,16,0.85)', backdropFilter: 'blur(8px)' }}>

      <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: '#080d18', border: '1px solid rgba(255,255,255,0.09)', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-[0.25em] text-emerald-400 uppercase">Students · New Enrollment</span>
              <h2 className="text-lg font-display font-bold text-white mt-0.5">
                {step === 5 ? 'Student Created' : 'Add New Student'}
              </h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] transition">
              <X size={16} />
            </button>
          </div>

          {step < 5 && (
            <div className="mt-4 flex items-center gap-1">
              {STEPS.map((s, i) => {
                const isActive    = step === s.id
                const isCompleted = step > s.id
                return (
                  <div key={s.id} className="flex items-center gap-1 flex-1">
                    <div className="flex items-center gap-1.5 flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-500 text-slate-950' :
                        isActive    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' :
                                      'bg-white/[0.04] text-slate-600'
                      }`}>
                        {isCompleted ? <CheckCircle2 size={11} /> : <s.icon size={11} />}
                      </div>
                      <span className={`text-[10px] font-semibold tracking-wide hidden sm:block transition-colors duration-300 ${
                        isActive ? 'text-emerald-400' : isCompleted ? 'text-slate-400' : 'text-slate-600'
                      }`}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`h-px flex-1 mx-1 transition-all duration-300 ${isCompleted ? 'bg-emerald-500/50' : 'bg-white/[0.06]'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Step 1: Personal ── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Photo */}
              <div className="flex items-center gap-5">
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-2xl flex-shrink-0 cursor-pointer overflow-hidden group"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}>
                  {s1.photoPreview
                    ? <img src={s1.photoPreview} alt="preview" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <Camera size={18} className="text-slate-600" />
                        <span className="text-[9px] text-slate-600">Photo</span>
                      </div>
                  }
                  <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Camera size={16} className="text-emerald-400" />
                  </div>
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white mb-0.5">Student Photo</p>
                  <p className="text-[11px] text-slate-500">Click to upload a passport-size photo. JPEG, PNG accepted. Optional.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel required>First Name</FieldLabel>
                  <Input value={s1.first_name} onChange={v => setS1(s => ({ ...s, first_name: v }))} placeholder="e.g. Peter" required />
                </div>
                <div>
                  <FieldLabel required>Last Name</FieldLabel>
                  <Input value={s1.last_name} onChange={v => setS1(s => ({ ...s, last_name: v }))} placeholder="e.g. Kamau" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel required>Gender</FieldLabel>
                  <Select value={s1.gender} onChange={v => setS1(s => ({ ...s, gender: v }))} options={GENDERS} />
                </div>
                <div>
                  <FieldLabel required>Date of Birth</FieldLabel>
                  <Input type="date" value={s1.date_of_birth} onChange={v => setS1(s => ({ ...s, date_of_birth: v }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Blood Group</FieldLabel>
                  <Select value={s1.blood_group} onChange={v => setS1(s => ({ ...s, blood_group: v }))}
                    options={[{ value: '', label: 'Not specified' }, ...BLOOD_GROUPS.map(b => ({ value: b, label: b }))]} />
                </div>
                <div>
                  <FieldLabel>Nationality</FieldLabel>
                  <Input value={s1.nationality} onChange={v => setS1(s => ({ ...s, nationality: v }))} placeholder="Kenyan" />
                </div>
              </div>

              <div>
                <FieldLabel>Religion</FieldLabel>
                <Input value={s1.religion} onChange={v => setS1(s => ({ ...s, religion: v }))} placeholder="e.g. Christian, Muslim…" />
              </div>

              {!step1Valid && (s1.first_name || s1.last_name || s1.date_of_birth) && (
                <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> First name (min. 2 chars), last name, and date of birth are required.
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: Academic & Contact ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl p-3 text-[11px] text-slate-500"
                style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)' }}>
                Enrolling <strong className="text-white">{s1.first_name} {s1.last_name}</strong> — fill in contact &amp; class details.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Phone Number</FieldLabel>
                  <Input type="tel" value={s2.phone} onChange={v => setS2(s => ({ ...s, phone: v }))} placeholder="+254 7XX XXX XXX" />
                </div>
                <div>
                  <FieldLabel>Email Address</FieldLabel>
                  <Input type="email" value={s2.email} onChange={v => setS2(s => ({ ...s, email: v }))} placeholder="student@school.ac.ke" />
                </div>
              </div>

              <div>
                <FieldLabel>Home Address</FieldLabel>
                <Input value={s2.address} onChange={v => setS2(s => ({ ...s, address: v }))} placeholder="Estate, Town, County" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Class / Stream</FieldLabel>
                  <select value={s2.school_class} onChange={e => setS2(s => ({ ...s, school_class: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white outline-none appearance-none"
                    style={INPUT_STYLE}>
                    <option value="">No class yet</option>
                    {classes.map(c => <option key={c.id} value={String(c.id)}>{c.display_name}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Enrollment Date</FieldLabel>
                  <Input type="date" value={s2.enrollment_date} onChange={v => setS2(s => ({ ...s, enrollment_date: v }))} />
                </div>
              </div>

              <div>
                <FieldLabel>Custom Admission Number</FieldLabel>
                <Input value={s2.custom_admission} onChange={v => setS2(s => ({ ...s, custom_admission: v }))}
                  placeholder="Leave blank for auto-generated (e.g. STM2026001)" />
                <p className="text-[10px] text-slate-600 mt-1">
                  Auto-generated from your school prefix setting if left blank.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Guardian ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl p-3 text-[11px] text-slate-500"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                Add a parent or guardian for <strong className="text-white">{s1.first_name} {s1.last_name}</strong>.
                The guardian will appear on the student profile and can be given a parent login account.
              </div>

              <button
                onClick={() => setS3(s => ({ ...s, skip: !s.skip }))}
                className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-[13px] font-semibold transition ${
                  s3.skip
                    ? 'text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={s3.skip
                  ? { background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
                }>
                <span>{s3.skip ? 'Skipping guardian — click to add one' : 'Skip guardian (add later from profile)'}</span>
                <ChevronRight size={14} />
              </button>

              {!s3.skip && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel required>Guardian Full Name</FieldLabel>
                      <Input value={s3.name} onChange={v => setS3(s => ({ ...s, name: v }))} placeholder="e.g. John Kamau" />
                    </div>
                    <div>
                      <FieldLabel>Relationship</FieldLabel>
                      <Select value={s3.relationship} onChange={v => setS3(s => ({ ...s, relationship: v }))} options={RELATIONSHIPS} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel required>Phone</FieldLabel>
                      <Input type="tel" value={s3.phone} onChange={v => setS3(s => ({ ...s, phone: v }))} placeholder="+254 7XX XXX XXX" />
                    </div>
                    <div>
                      <FieldLabel>Email</FieldLabel>
                      <Input type="email" value={s3.email} onChange={v => setS3(s => ({ ...s, email: v }))} placeholder="parent@email.com" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === 4 && (
            <div className="space-y-4">
              {error && (
                <div className="rounded-xl px-4 py-3 flex items-start gap-2 text-sm"
                  style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <AlertTriangle size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
                  <span className="text-rose-300">{error}</span>
                </div>
              )}

              <div className="rounded-xl overflow-hidden" style={GLASS}>
                <div className="px-4 py-2 border-b border-white/[0.06]">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Personal Details</p>
                </div>
                <div className="px-4 py-2">
                  <ReviewRow label="Full Name"   value={`${s1.first_name} ${s1.last_name}`} />
                  <ReviewRow label="Gender"      value={GENDERS.find(g => g.value === s1.gender)?.label ?? s1.gender} />
                  <ReviewRow label="Date of Birth" value={s1.date_of_birth} />
                  <ReviewRow label="Nationality" value={s1.nationality} />
                  <ReviewRow label="Blood Group" value={s1.blood_group} />
                  <ReviewRow label="Religion"    value={s1.religion} />
                </div>
              </div>

              <div className="rounded-xl overflow-hidden" style={GLASS}>
                <div className="px-4 py-2 border-b border-white/[0.06]">
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Academic &amp; Contact</p>
                </div>
                <div className="px-4 py-2">
                  <ReviewRow label="Class"       value={selectedClassName} />
                  <ReviewRow label="Enrollment"  value={s2.enrollment_date} />
                  <ReviewRow label="Phone"       value={s2.phone} />
                  <ReviewRow label="Email"       value={s2.email} />
                  <ReviewRow label="Address"     value={s2.address} />
                  <ReviewRow label="Adm. Number" value={s2.custom_admission || '(auto-generated)'} />
                </div>
              </div>

              {!s3.skip && s3.name && (
                <div className="rounded-xl overflow-hidden" style={GLASS}>
                  <div className="px-4 py-2 border-b border-white/[0.06]">
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Guardian</p>
                  </div>
                  <div className="px-4 py-2">
                    <ReviewRow label="Name"         value={s3.name} />
                    <ReviewRow label="Relationship" value={s3.relationship} />
                    <ReviewRow label="Phone"        value={s3.phone} />
                    <ReviewRow label="Email"        value={s3.email} />
                  </div>
                </div>
              )}

              <div className="rounded-xl px-4 py-3 text-[11px] text-slate-500"
                style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)' }}>
                A student portal login account will be auto-created with username = admission number and password <strong className="text-slate-300">student123</strong>.
              </div>
            </div>
          )}

          {/* ── Step 5: Success ── */}
          {step === 5 && created && (
            <div className="space-y-5 py-2">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <UserCheck size={28} className="text-emerald-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-display font-bold text-white">Student Enrolled!</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {s1.first_name} {s1.last_name} has been successfully added to the school records.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl p-4 space-y-3" style={GLASS}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wide">Admission Number</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">{created.admission_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wide">Student Portal Login</span>
                  <span className={`text-[12px] font-semibold ${created.loginCreated ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {created.loginCreated ? `${created.loginUsername} / student123` : 'Account exists'}
                  </span>
                </div>
                {!s3.skip && s3.name && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wide">Guardian</span>
                    <span className="text-[12px] text-slate-300">{s3.name} · {s3.phone}</span>
                  </div>
                )}
              </div>

              {creatingLogin && (
                <div className="flex items-center gap-2 text-[12px] text-slate-400">
                  <Loader2 size={12} className="animate-spin" /> Creating login account…
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddAnother}
                  className="rounded-xl py-3 text-[13px] font-semibold text-slate-300 transition hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  + Add Another
                </button>
                <button
                  onClick={handleViewProfile}
                  className="rounded-xl py-3 text-[13px] font-bold text-slate-950 flex items-center justify-center gap-2 transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  View Profile <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Navigation */}
        {step < 5 && (
          <div className="px-6 pb-5 pt-3 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

            {error && step === 4 && (
              <p className="text-[11px] text-rose-400 mb-3 flex items-center gap-1.5">
                <AlertTriangle size={11} /> {error}
              </p>
            )}

            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  onClick={() => { setError(null); setStep(s => s - 1) }}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-400 hover:text-white transition"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <ArrowLeft size={14} /> Back
                </button>
              )}

              <div className="flex-1" />

              {step < 4 && (
                <button
                  onClick={() => { setError(null); setStep(s => s + 1) }}
                  disabled={step === 1 && !step1Valid}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-slate-950 transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  {step === 3 && s3.skip ? 'Skip & Review' : 'Continue'} <ArrowRight size={14} />
                </button>
              )}

              {step === 4 && (
                <button
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-[13px] font-bold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin" /> Creating…</>
                    : <><UserCheck size={14} /> Enroll Student</>
                  }
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

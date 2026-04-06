import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../api/client'
import {
  AlertCircle,
  Building2,
  Check,
  ExternalLink,
  MapPin,
  Palette,
  Upload,
} from 'lucide-react'
import PageHero from '../../components/PageHero'

interface ProfileData {
  id?: number
  school_name: string
  logo_url?: string | null
  motto: string
  address: string
  phone: string
  email_address: string
  website: string
  county: string
  country: string
  timezone: string
  language: string
  primary_color: string
  secondary_color: string
  font_family: string
}

const TIMEZONES = [
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Africa/Accra',
  'Africa/Addis_Ababa',
  'Africa/Dar_es_Salaam',
  'Africa/Kampala',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
  'UTC',
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili (Kiswahili)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'ar', label: 'Arabic' },
  { value: 'am', label: 'Amharic' },
  { value: 'yo', label: 'Yoruba' },
  { value: 'ha', label: 'Hausa' },
  { value: 'ig', label: 'Igbo' },
]

const DEFAULTS: ProfileData = {
  school_name: '',
  logo_url: null,
  motto: '',
  address: '',
  phone: '',
  email_address: '',
  website: '',
  county: '',
  country: 'Kenya',
  timezone: 'Africa/Nairobi',
  language: 'en',
  primary_color: '#10b981',
  secondary_color: '#0ea5e9',
  font_family: 'Inter',
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter - Modern, clean' },
  { value: 'Space Grotesk', label: 'Space Grotesk - Technical, strong' },
  { value: 'Poppins', label: 'Poppins - Friendly, rounded' },
  { value: 'Manrope', label: 'Manrope - Geometric, elegant' },
  { value: 'DM Sans', label: 'DM Sans - Professional, balanced' },
  { value: 'Outfit', label: 'Outfit - Contemporary, warm' },
]

const inputClassName =
  'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400'

export default function SettingsSchoolProfilePage() {
  const [form, setForm] = useState<ProfileData>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiClient.get<any>('/school/profile/')
        const profile = res.data?.profile ?? null
        if (!active || !profile?.id) {
          return
        }

        setForm({
          id: profile.id,
          school_name: profile.school_name ?? '',
          logo_url: profile.logo_url ?? null,
          motto: profile.motto ?? '',
          address: profile.address ?? '',
          phone: profile.phone ?? '',
          email_address: profile.email_address ?? '',
          website: profile.website ?? '',
          county: profile.county ?? '',
          country: profile.country ?? 'Kenya',
          timezone: profile.timezone ?? 'Africa/Nairobi',
          language: profile.language ?? 'en',
          primary_color: profile.primary_color ?? '#10b981',
          secondary_color: profile.secondary_color ?? '#0ea5e9',
          font_family: profile.font_family ?? 'Inter',
        })
        setLogoPreview(profile.logo_url ?? null)
      } catch {
        if (active) {
          setError('Failed to load school profile.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const setField = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) {
      return
    }
    setLogoFile(nextFile)
    setLogoPreview(URL.createObjectURL(nextFile))
  }

  const save = async () => {
    if (!form.school_name.trim()) {
      setError('School name is required.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'logo_url' || key === 'id') {
          return
        }
        payload.append(key, String(value ?? ''))
      })

      if (logoFile) {
        payload.append('logo', logoFile)
      }

      await apiClient.patch('/school/profile/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setSuccess('School profile saved successfully.')
      const refreshed = await apiClient.get<any>('/school/profile/')
      const profile = refreshed.data?.profile ?? null
      if (profile?.id) {
        setForm({
          id: profile.id,
          school_name: profile.school_name ?? '',
          logo_url: profile.logo_url ?? null,
          motto: profile.motto ?? '',
          address: profile.address ?? '',
          phone: profile.phone ?? '',
          email_address: profile.email_address ?? '',
          website: profile.website ?? '',
          county: profile.county ?? '',
          country: profile.country ?? 'Kenya',
          timezone: profile.timezone ?? 'Africa/Nairobi',
          language: profile.language ?? 'en',
          primary_color: profile.primary_color ?? '#10b981',
          secondary_color: profile.secondary_color ?? '#0ea5e9',
          font_family: profile.font_family ?? 'Inter',
        })
        setLogoPreview(profile.logo_url ?? null)
      }
    } catch {
      setError('Failed to save profile. Please review the fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-500 animate-pulse">Loading school profile...</div>
  }

  return (
    <div className="max-w-3xl space-y-8">
      <PageHero
        badge="SETTINGS"
        badgeColor="slate"
        title="School Profile and Branding"
        subtitle="Identity, branding, and contact details that define the institution."
        icon="CP"
      />

      <div>
        <h1 className="text-2xl font-display font-bold text-white">School Profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure the institution identity that appears across printed documents, reports, and the
          tenant shell.
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <Check className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      ) : null}

      <section className="rounded-2xl glass-panel space-y-5 p-6">
        <div className="mb-1 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-sky-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">
            School Identity
          </h2>
        </div>

        <div className="flex items-start gap-5">
          <div className="flex-shrink-0">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="School logo"
                className="h-20 w-20 rounded-2xl border border-white/[0.09] bg-slate-950 object-contain"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-slate-950 text-center text-xs text-slate-600">
                No Logo
              </div>
            )}
          </div>

          <div className="flex-1">
            <p className="mb-2 text-xs font-semibold text-slate-300">School Logo</p>
            <p className="mb-3 text-[11px] text-slate-500">
              Used on official documents, receipts, and the institution header. PNG or JPG works
              best.
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-300 transition hover:border-emerald-400 hover:text-emerald-300"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Logo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              School Name *
            </label>
            <input
              value={form.school_name}
              onChange={(event) => setField('school_name', event.target.value)}
              placeholder="e.g. Rynaty High School"
              className={inputClassName}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              School Motto / Tagline
            </label>
            <input
              value={form.motto}
              onChange={(event) => setField('motto', event.target.value)}
              placeholder="e.g. Excellence in Education"
              className={inputClassName}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl glass-panel space-y-5 p-6">
        <div className="mb-1 flex items-center gap-2">
          <Palette className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">
            Branding and Theme
          </h2>
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          Customize the visual identity used across reports and institution-facing surfaces.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Primary Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={(event) => setField('primary_color', event.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-white/[0.09] bg-slate-950 p-0.5"
              />
              <input
                value={form.primary_color}
                onChange={(event) => setField('primary_color', event.target.value)}
                placeholder="#10b981"
                maxLength={7}
                className="flex-1 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-emerald-400"
              />
            </div>
            <div
              className="mt-2 h-6 w-full rounded-xl"
              style={{ background: form.primary_color, opacity: 0.8 }}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Secondary Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.secondary_color}
                onChange={(event) => setField('secondary_color', event.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-white/[0.09] bg-slate-950 p-0.5"
              />
              <input
                value={form.secondary_color}
                onChange={(event) => setField('secondary_color', event.target.value)}
                placeholder="#0ea5e9"
                maxLength={7}
                className="flex-1 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-emerald-400"
              />
            </div>
            <div
              className="mt-2 h-6 w-full rounded-xl"
              style={{ background: form.secondary_color, opacity: 0.8 }}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
            System Font Family
          </label>
          <select
            value={form.font_family}
            onChange={(event) => setField('font_family', event.target.value)}
            className={inputClassName}
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            border: `2px solid ${form.primary_color}40`,
            background: `${form.primary_color}08`,
          }}
        >
          <p
            className="mb-3 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: form.primary_color }}
          >
            Live Preview
          </p>
          <div className="mb-4 flex items-center gap-3">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="School logo preview"
                className="h-10 w-10 rounded-xl bg-white/5 object-contain"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white"
                style={{ background: `${form.primary_color}30` }}
              >
                SP
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-white" style={{ fontFamily: form.font_family }}>
                {form.school_name || 'Your School Name'}
              </p>
              <p className="text-xs" style={{ color: form.secondary_color }}>
                {form.motto || 'School Motto Here'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full px-4 py-1.5 text-xs font-bold text-white"
              style={{ background: form.primary_color }}
            >
              Primary Button
            </button>
            <button
              className="rounded-full px-4 py-1.5 text-xs font-bold text-white"
              style={{ background: form.secondary_color }}
            >
              Secondary Button
            </button>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Quick Theme Presets
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'Emerald', primary: '#10b981', secondary: '#0ea5e9' },
              { name: 'Royal Blue', primary: '#3b82f6', secondary: '#8b5cf6' },
              { name: 'Crimson', primary: '#ef4444', secondary: '#f59e0b' },
              { name: 'Purple', primary: '#8b5cf6', secondary: '#ec4899' },
              { name: 'Orange', primary: '#f97316', secondary: '#eab308' },
              { name: 'Teal', primary: '#14b8a6', secondary: '#06b6d4' },
            ].map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setField('primary_color', preset.primary)
                  setField('secondary_color', preset.secondary)
                }}
                className="flex items-center gap-2 rounded-full border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/30"
              >
                <span className="flex gap-1">
                  <span className="h-3 w-3 rounded-full" style={{ background: preset.primary }} />
                  <span className="h-3 w-3 rounded-full" style={{ background: preset.secondary }} />
                </span>
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl glass-panel space-y-4 p-6">
        <div className="mb-1 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">
            Contact Information
          </h2>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
            Physical Address
          </label>
          <textarea
            value={form.address}
            onChange={(event) => setField('address', event.target.value)}
            rows={2}
            placeholder="P.O. Box 123, Nairobi"
            className={`${inputClassName} resize-none`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Phone Number
            </label>
            <input
              value={form.phone}
              onChange={(event) => setField('phone', event.target.value)}
              placeholder="+254 700 000 000"
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Email Address
            </label>
            <input
              type="email"
              value={form.email_address}
              onChange={(event) => setField('email_address', event.target.value)}
              placeholder="info@school.ac.ke"
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Website
            </label>
            <input
              value={form.website}
              onChange={(event) => setField('website', event.target.value)}
              placeholder="https://www.school.ac.ke"
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              County / State
            </label>
            <input
              value={form.county}
              onChange={(event) => setField('county', event.target.value)}
              placeholder="Nairobi"
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Country
            </label>
            <input
              value={form.country}
              onChange={(event) => setField('country', event.target.value)}
              placeholder="Kenya"
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Timezone
            </label>
            <select
              value={form.timezone}
              onChange={(event) => setField('timezone', event.target.value)}
              className={inputClassName}
            >
              {TIMEZONES.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              System Language
            </label>
            <select
              value={form.language}
              onChange={(event) => setField('language', event.target.value)}
              className={inputClassName}
            >
              {LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-slate-950/40 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">
              Ownership Notes
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              School Profile now owns identity, contact details, and branding only. Finance defaults,
              admission numbering, security policy, and lifecycle readiness live in dedicated
              settings areas so the control plane can evaluate one canonical source of truth.
            </p>
          </div>
          <ExternalLink className="h-4 w-4 flex-shrink-0 text-emerald-300" />
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            to="/settings/control-plane"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-3 py-1.5 text-emerald-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
          >
            Institution Control Plane
          </Link>
          <Link
            to="/settings/finance"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-3 py-1.5 text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Finance Configuration
          </Link>
          <Link
            to="/settings/admission"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-3 py-1.5 text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Admission Numbering
          </Link>
          <Link
            to="/settings/security"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-3 py-1.5 text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Security Policy
          </Link>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-emerald-500 px-8 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}

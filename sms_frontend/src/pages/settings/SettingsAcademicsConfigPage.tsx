import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, BookOpen, Calendar, CheckCircle2, GraduationCap } from 'lucide-react'
import { apiClient } from '../../api/client'
import { type ControlPlaneSummary, getControlPlaneSummary } from '../../api/controlPlane'
import PageHero from '../../components/PageHero'

interface AcademicYearRef {
  id: number
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

interface TermRef {
  id: number
  name: string
  start_date: string
  end_date: string
  academic_year_id: number
  is_current: boolean
}

interface GradingSchemeRef {
  id: number
  name: string
  is_default: boolean
  is_active: boolean
}

const card = 'rounded-2xl glass-panel p-6 space-y-4'

export default function SettingsAcademicsConfigPage() {
  const [summary, setSummary] = useState<ControlPlaneSummary | null>(null)
  const [years, setYears] = useState<AcademicYearRef[]>([])
  const [terms, setTerms] = useState<TermRef[]>([])
  const [schemes, setSchemes] = useState<GradingSchemeRef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [nextSummary, yearsResponse, termsResponse, schemesResponse] = await Promise.all([
          getControlPlaneSummary(),
          apiClient.get<AcademicYearRef[]>('/academics/ref/academic-years/'),
          apiClient.get<TermRef[]>('/academics/ref/terms/'),
          apiClient.get<GradingSchemeRef[]>('/academics/grading-schemes/'),
        ])
        if (!mounted) return
        setSummary(nextSummary)
        setYears(yearsResponse.data)
        setTerms(termsResponse.data)
        setSchemes(schemesResponse.data)
      } catch {
        if (!mounted) return
        setError('Failed to load the academic baseline.')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return <div className="rounded-2xl glass-panel p-6 text-sm text-slate-300">Loading academic baseline...</div>
  }

  const currentYear = years.find((year) => year.is_current) ?? null
  const currentTerm = terms.find((term) => term.is_current) ?? null
  const gradingSection = summary?.sections.grading
  const academicsSection = summary?.sections.academics

  return (
    <div className="space-y-8">
      <PageHero
        badge="SETTINGS"
        badgeColor="sky"
        title="Academic Baseline"
        subtitle="A truthful control-plane view of academic year, term, and grading readiness."
        icon={<GraduationCap className="h-6 w-6 text-sky-300" />}
      />

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <section className={card}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Academic configuration is now read from backend truth</h1>
            <p className="mt-2 text-sm text-slate-400">
              This page no longer pretends local-only lists are saved. It reflects current academic years, terms, and grading schemes from the real academic and control-plane APIs.
            </p>
          </div>
          <Link to="/settings/control-plane" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300 hover:text-emerald-200">
            Open Control Plane
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">Calendar Baseline</h2>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Current academic year</span>
              <span>{currentYear ? `${currentYear.name} (${currentYear.start_date} to ${currentYear.end_date})` : 'Not configured'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Current term</span>
              <span>{currentTerm ? `${currentTerm.name} (${currentTerm.start_date} to ${currentTerm.end_date})` : 'Not configured'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Control-plane status</span>
              <span className={academicsSection?.status === 'READY' ? 'text-emerald-300' : 'text-amber-300'}>{academicsSection?.status ?? 'Unknown'}</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">What to edit</p>
            <Link to="/modules/academics/structure" className="flex items-center justify-between rounded-lg border border-white/[0.07] px-3 py-2 text-sm text-slate-200 transition hover:border-sky-400/40">
              Academic structure editor
              <ArrowRight className="h-4 w-4 text-sky-300" />
            </Link>
            <Link to="/modules/academics/calendar" className="flex items-center justify-between rounded-lg border border-white/[0.07] px-3 py-2 text-sm text-slate-200 transition hover:border-sky-400/40">
              Academic calendar
              <ArrowRight className="h-4 w-4 text-sky-300" />
            </Link>
          </div>
        </section>

        <section className={card}>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">Grading Baseline</h2>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Active grading schemes</span>
              <span>{schemes.filter((scheme) => scheme.is_active).length}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Default grading scheme</span>
              <span>{schemes.find((scheme) => scheme.is_default)?.name ?? 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Control-plane status</span>
              <span className={gradingSection?.status === 'READY' ? 'text-emerald-300' : 'text-amber-300'}>{gradingSection?.status ?? 'Unknown'}</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Available grading schemes</p>
            <div className="mt-3 space-y-2">
              {schemes.length > 0 ? schemes.map((scheme) => (
                <div key={scheme.id} className="flex items-center justify-between rounded-lg border border-white/[0.07] px-3 py-2 text-sm text-slate-200">
                  <span>{scheme.name}</span>
                  {scheme.is_default ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <span className="text-xs text-slate-500">Secondary</span>}
                </div>
              )) : <p className="text-sm text-slate-400">No grading schemes are configured yet.</p>}
            </div>
          </div>
        </section>
      </div>

      <section className={card}>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">Current records</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Academic years</p>
            <div className="mt-3 space-y-2">
              {years.length > 0 ? years.map((year) => (
                <div key={year.id} className="flex items-center justify-between rounded-lg border border-white/[0.07] px-3 py-2 text-sm text-slate-200">
                  <span>{year.name}</span>
                  <span className={year.is_current ? 'text-emerald-300' : 'text-slate-500'}>{year.is_current ? 'Current' : 'Historical'}</span>
                </div>
              )) : <p className="text-sm text-slate-400">No academic years found.</p>}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Terms</p>
            <div className="mt-3 space-y-2">
              {terms.length > 0 ? terms.map((term) => (
                <div key={term.id} className="flex items-center justify-between rounded-lg border border-white/[0.07] px-3 py-2 text-sm text-slate-200">
                  <span>{term.name}</span>
                  <span className={term.is_current ? 'text-emerald-300' : 'text-slate-500'}>{term.is_current ? 'Current' : formatValue(term.academic_year_id)}</span>
                </div>
              )) : <p className="text-sm text-slate-400">No terms found.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function formatValue(value: number): string {
  return String(value)
}

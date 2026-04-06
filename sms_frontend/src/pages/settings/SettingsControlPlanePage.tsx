import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock3, ExternalLink, Play, RefreshCw, ShieldCheck } from 'lucide-react'
import { apiClient } from '../../api/client'
import {
  type ControlPlaneBlocker,
  type ControlPlaneSection,
  type ControlPlaneSummary,
  type LifecycleRun,
  type LifecycleTaskRun,
  type LifecycleTemplate,
  completeLifecycleRun,
  completeLifecycleTask,
  createLifecycleRun,
  getControlPlaneSummary,
  getLifecycleRun,
  getLifecycleRuns,
  getLifecycleTemplates,
  startLifecycleRun,
  waiveLifecycleTask,
} from '../../api/controlPlane'
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

type TemplateCode = 'TENANT_ONBOARDING' | 'TERM_START' | 'YEAR_CLOSE'

const SECTION_ORDER = ['school_profile', 'admission', 'academics', 'grading', 'finance', 'security', 'modules', 'lifecycle']
const TEMPLATE_ORDER: TemplateCode[] = ['TENANT_ONBOARDING', 'TERM_START', 'YEAR_CLOSE']

const statusTone: Record<string, string> = {
  READY: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  PARTIALLY_READY: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  NOT_READY: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  DRAFT: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  IN_PROGRESS: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  BLOCKED: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  COMPLETED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  CANCELLED: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  PENDING: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  WAIVED: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
}

const severityTone: Record<string, string> = {
  CRITICAL: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  WARNING: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  INFO: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
}

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatValue(value: unknown): string {
  if (value == null) return 'Not set'
  if (Array.isArray(value)) return value.length === 0 ? 'None' : value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function extractApiError(error: any, fallback: string): string {
  return error?.response?.data?.error || error?.response?.data?.detail || fallback
}

export default function SettingsControlPlanePage() {
  const [summary, setSummary] = useState<ControlPlaneSummary | null>(null)
  const [templates, setTemplates] = useState<LifecycleTemplate[]>([])
  const [runs, setRuns] = useState<LifecycleRun[]>([])
  const [years, setYears] = useState<AcademicYearRef[]>([])
  const [terms, setTerms] = useState<TermRef[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [taskNotes, setTaskNotes] = useState<Record<number, string>>({})
  const [targets, setTargets] = useState<Record<TemplateCode, { academicYearId: number | null; termId: number | null }>>({
    TENANT_ONBOARDING: { academicYearId: null, termId: null },
    TERM_START: { academicYearId: null, termId: null },
    YEAR_CLOSE: { academicYearId: null, termId: null },
  })

  const loadAll = async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const [nextSummary, nextTemplates, nextRuns, yearsResponse, termsResponse] = await Promise.all([
        getControlPlaneSummary(),
        getLifecycleTemplates(),
        getLifecycleRuns(),
        apiClient.get<AcademicYearRef[]>('/academics/ref/academic-years/'),
        apiClient.get<TermRef[]>('/academics/ref/terms/'),
      ])
      const nextYears = yearsResponse.data
      const nextTerms = termsResponse.data
      setSummary(nextSummary)
      setTemplates(nextTemplates)
      setRuns(nextRuns)
      setYears(nextYears)
      setTerms(nextTerms)
      setTargets((current) => {
        const currentYear = nextYears.find((year) => year.is_current) ?? nextYears[0] ?? null
        const currentTerm = nextTerms.find((term) => term.is_current) ?? nextTerms[0] ?? null
        return {
          TENANT_ONBOARDING: current.TENANT_ONBOARDING,
          TERM_START: {
            academicYearId: current.TERM_START.academicYearId ?? currentYear?.id ?? null,
            termId: current.TERM_START.termId ?? currentTerm?.id ?? null,
          },
          YEAR_CLOSE: {
            academicYearId: current.YEAR_CLOSE.academicYearId ?? currentYear?.id ?? null,
            termId: null,
          },
        }
      })
    } catch (loadError: any) {
      setError(extractApiError(loadError, 'Failed to load the institution control plane.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const latestRunFor = (templateCode: TemplateCode): LifecycleRun | undefined =>
    runs.find((run) => run.template_code === templateCode)

  const refreshOneRun = async (runId: number) => {
    const nextRun = await getLifecycleRun(runId)
    setRuns((current) => {
      const remaining = current.filter((run) => run.id !== runId)
      return [nextRun, ...remaining].sort((left, right) => right.id - left.id)
    })
    return nextRun
  }

  const mutateRun = async (key: string, action: () => Promise<LifecycleRun>, successMessage: string) => {
    setActionKey(key)
    setError(null)
    try {
      const nextRun = await action()
      setToast(successMessage)
      setRuns((current) => {
        const remaining = current.filter((run) => run.id !== nextRun.id)
        return [nextRun, ...remaining].sort((left, right) => right.id - left.id)
      })
      await loadAll(true)
    } catch (mutationError: any) {
      setError(extractApiError(mutationError, 'Request failed.'))
      const runId = mutationError?.response?.data?.run?.id
      if (runId) {
        await refreshOneRun(runId)
      }
    } finally {
      setActionKey(null)
    }
  }

  const createRunFor = async (templateCode: TemplateCode) => {
    const target = targets[templateCode]
    await mutateRun(
      `create-${templateCode}`,
      () => createLifecycleRun({
        template_code: templateCode,
        target_academic_year: target.academicYearId,
        target_term: target.termId,
      }),
      'Lifecycle run created.',
    )
  }

  const completeTask = async (run: LifecycleRun, task: LifecycleTaskRun) => {
    await mutateRun(
      `task-complete-${task.id}`,
      () => completeLifecycleTask(run.id, task.id, { notes: taskNotes[task.id] ?? '' }),
      'Task completed.',
    )
  }

  const waiveTask = async (run: LifecycleRun, task: LifecycleTaskRun) => {
    const notes = (taskNotes[task.id] ?? '').trim()
    if (!notes) {
      setError('Add precise waiver notes before waiving a task.')
      return
    }
    await mutateRun(
      `task-waive-${task.id}`,
      () => waiveLifecycleTask(run.id, task.id, { notes }),
      'Task waived.',
    )
  }

  const renderSectionCard = (sectionKey: string, section: ControlPlaneSection) => {
    const dataRows = Object.entries(section.data ?? {}).slice(0, 4)
    return (
      <div key={sectionKey} className="rounded-2xl glass-panel p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{sectionKey.replace(/_/g, ' ')}</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{section.label}</h2>
          </div>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusTone[section.status] ?? statusTone.READY}`}>
            {formatLabel(section.status)}
          </span>
        </div>
        {dataRows.length > 0 ? (
          <div className="space-y-2 text-sm text-slate-300">
            {dataRows.map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <span className="text-slate-500">{formatLabel(key)}</span>
                <span className="text-right text-slate-200">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No baseline data recorded yet.</p>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
          <span className="text-xs text-slate-500">{section.blockers.length} blocker(s)</span>
          <Link to={section.owner.route} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200">
            Open owner
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  const renderRunPanel = (template: LifecycleTemplate) => {
    const run = latestRunFor(template.code)
    const target = targets[template.code]
    const filteredTerms = terms.filter((term) => !target.academicYearId || term.academic_year_id === target.academicYearId)
    return (
      <section key={template.code} className="rounded-2xl glass-panel p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{template.code.replace(/_/g, ' ')}</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{template.name}</h2>
            <p className="mt-2 text-sm text-slate-400">{template.description}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusTone[run?.status ?? 'DRAFT'] ?? statusTone.DRAFT}`}>
            {run ? formatLabel(run.status) : 'Not Started'}
          </span>
        </div>

        {(template.code === 'TERM_START' || template.code === 'YEAR_CLOSE') && !run ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {template.code === 'YEAR_CLOSE' ? 'Target Next Year' : 'Target Academic Year'}
              </span>
              <select
                value={target.academicYearId ?? ''}
                onChange={(event) => {
                  const nextYearId = event.target.value ? Number(event.target.value) : null
                  setTargets((current) => ({
                    ...current,
                    [template.code]: {
                      academicYearId: nextYearId,
                      termId: template.code === 'TERM_START' ? null : current[template.code].termId,
                    },
                  }))
                }}
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              >
                <option value="">Select academic year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>{year.name}</option>
                ))}
              </select>
            </label>
            {template.code === 'TERM_START' ? (
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target Term</span>
                <select
                  value={target.termId ?? ''}
                  onChange={(event) => {
                    const nextTermId = event.target.value ? Number(event.target.value) : null
                    setTargets((current) => ({
                      ...current,
                      TERM_START: {
                        ...current.TERM_START,
                        termId: nextTermId,
                      },
                    }))
                  }}
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
                >
                  <option value="">Select term</option>
                  {filteredTerms.map((term) => (
                    <option key={term.id} value={term.id}>{term.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}

        {!run ? (
          <button
            type="button"
            onClick={() => void createRunFor(template.code)}
            disabled={actionKey === `create-${template.code}`}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300 disabled:opacity-60"
          >
            {actionKey === `create-${template.code}` ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Create run
          </button>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Started</p>
                <p className="mt-1 text-sm text-slate-200">{run.started_at ? new Date(run.started_at).toLocaleString() : 'Not started'}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Completed</p>
                <p className="mt-1 text-sm text-slate-200">{run.completed_at ? new Date(run.completed_at).toLocaleString() : 'Open'}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Target Year</p>
                <p className="mt-1 text-sm text-slate-200">{run.target_academic_year_name ?? 'N/A'}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Target Term</p>
                <p className="mt-1 text-sm text-slate-200">{run.target_term_name ?? 'N/A'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {run.status === 'DRAFT' ? (
                <button
                  type="button"
                  onClick={() => void mutateRun(`start-${run.id}`, () => startLifecycleRun(run.id), 'Lifecycle run started.')}
                  disabled={actionKey === `start-${run.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-300 disabled:opacity-60"
                >
                  {actionKey === `start-${run.id}` ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Start run
                </button>
              ) : null}
              {run.status !== 'COMPLETED' && run.status !== 'CANCELLED' ? (
                <button
                  type="button"
                  onClick={() => void mutateRun(`complete-${run.id}`, () => completeLifecycleRun(run.id), 'Lifecycle run completed.')}
                  disabled={actionKey === `complete-${run.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300 disabled:opacity-60"
                >
                  {actionKey === `complete-${run.id}` ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Complete run
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void refreshOneRun(run.id)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.09] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh run
              </button>
            </div>

            <div className="space-y-3 border-t border-white/[0.07] pt-4">
              {run.task_runs?.map((task) => (
                <div key={task.id} className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{task.template_task_group || 'Task'}</p>
                      <h3 className="mt-1 text-sm font-semibold text-white">{task.template_task_title}</h3>
                      {task.template_task_description ? <p className="mt-1 text-sm text-slate-400">{task.template_task_description}</p> : null}
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusTone[task.status] ?? statusTone.PENDING}`}>
                      {formatLabel(task.status)}
                    </span>
                  </div>

                  {task.blocker_message ? (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                      {task.blocker_message}
                    </div>
                  ) : null}

                  <textarea
                    value={taskNotes[task.id] ?? task.notes ?? ''}
                    onChange={(event) => setTaskNotes((current) => ({ ...current, [task.id]: event.target.value }))}
                    rows={2}
                    placeholder={task.waivable ? 'Add a precise note with what was reviewed, where it was handled, and why the waiver is acceptable' : 'Optional completion notes'}
                    className="w-full resize-none rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    {run.status !== 'COMPLETED' && run.status !== 'CANCELLED' && task.status !== 'COMPLETED' && task.status !== 'WAIVED' ? (
                      <button
                        type="button"
                        onClick={() => void completeTask(run, task)}
                        disabled={Boolean(actionKey)}
                        className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300 disabled:opacity-60"
                      >
                        Mark complete
                      </button>
                    ) : null}
                    {run.status !== 'COMPLETED' && run.status !== 'CANCELLED' && task.waivable && task.status !== 'WAIVED' ? (
                      <button
                        type="button"
                        onClick={() => void waiveTask(run, task)}
                        disabled={Boolean(actionKey)}
                        className="rounded-xl border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:border-violet-300 disabled:opacity-60"
                      >
                        Waive task
                      </button>
                    ) : null}
                    {task.completed_at ? <span className="text-xs text-slate-500">Completed {new Date(task.completed_at).toLocaleString()} by {task.completed_by_name ?? 'system'}</span> : null}
                    {task.waived_at ? <span className="text-xs text-slate-500">Waived {new Date(task.waived_at).toLocaleString()} by {task.waived_by_name ?? 'system'}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    )
  }

  if (loading) {
    return <div className="rounded-2xl glass-panel p-6 text-sm text-slate-300">Loading institution control plane...</div>
  }

  const orderedSections = SECTION_ORDER
    .map((sectionKey) => [sectionKey, summary?.sections?.[sectionKey]] as const)
    .filter((entry): entry is readonly [string, ControlPlaneSection] => Boolean(entry[1]))

  return (
    <div className="space-y-8">
      <PageHero
        badge="SETTINGS"
        badgeColor="emerald"
        title="Institution Control Plane"
        subtitle="Track tenant readiness, resolve blockers, and run onboarding, term-start, and year-close checklists from one operational surface."
        icon={<ShieldCheck className="w-6 h-6 text-emerald-300" />}
        stats={[
          { label: 'Overall', value: summary?.overall_status ?? 'READY' },
          { label: 'Critical', value: summary?.summary_counts.critical_blockers ?? 0, color: '#fda4af' },
          { label: 'Warnings', value: summary?.summary_counts.warning_blockers ?? 0, color: '#fcd34d' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => void loadAll(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}
      {toast ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{toast}</div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {orderedSections.map(([sectionKey, section]) => renderSectionCard(sectionKey, section))}
      </section>

      <section className="rounded-2xl glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Readiness blockers</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Actionable blockers</h2>
          </div>
          <span className="text-sm text-slate-400">{summary?.blockers.length ?? 0} open</span>
        </div>
        {summary?.blockers.length ? (
          <div className="space-y-3">
            {summary.blockers.map((blocker: ControlPlaneBlocker) => (
              <div key={`${blocker.section}-${blocker.code}`} className={`rounded-xl border px-4 py-3 ${severityTone[blocker.severity] ?? severityTone.INFO}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em]">{blocker.severity}</p>
                    <p className="mt-1 text-sm font-semibold">{formatLabel(blocker.section)}</p>
                    <p className="mt-2 text-sm">{blocker.message}</p>
                  </div>
                  <Link to={blocker.route} className="inline-flex items-center gap-1 text-xs font-semibold hover:underline">
                    Resolve
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">
            No blockers are currently open. The tenant is ready for guided lifecycle operations.
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Lifecycle automation</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Guided runs</h2>
          <p className="mt-2 text-sm text-slate-400">Create auditable onboarding, term-start, and year-close runs and work through each checklist task directly from here.</p>
        </div>
        {TEMPLATE_ORDER.map((templateCode) => {
          const template = templates.find((row) => row.code === templateCode)
          return template ? renderRunPanel(template) : null
        })}
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-slate-950/40 p-5">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-5 w-5 text-slate-400" />
          <div>
            <h2 className="text-base font-semibold text-white">Ownership map</h2>
            <p className="mt-2 text-sm text-slate-400">
              Use the focused editors for actual changes: school profile for identity and branding, admission for numbering,
              finance for billing defaults, security for access policy, academics for baseline visibility, and module settings for enablement.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

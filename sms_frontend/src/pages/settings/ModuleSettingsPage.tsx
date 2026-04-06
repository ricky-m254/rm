import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import PageHero from '../../components/PageHero'
import {
  type FeatureToggles,
  type ModuleThemeSettings,
  type ModuleThemeSettingsInput,
  type TenantModule,
  getTenantModuleSettings,
  getTenantModules,
  updateTenantModuleSettings,
} from '../../api/moduleSettings'

const PRESETS = ['DEFAULT', 'MODERN', 'CLASSIC', 'MINIMAL', 'DARK'] as const
const SIDEBARS = ['COLLAPSED', 'EXPANDED', 'ICON_ONLY'] as const

const EMPTY_TOGGLES: FeatureToggles = {
  analytics: true,
  reports: true,
  export: true,
  ai_assistant: false,
}

function normalizeModulePathKey(value: string | undefined): string {
  if (!value) return ''
  return value.trim().replace(/-/g, '_').toUpperCase()
}

function buildModuleSettingsRoute(slug: string): string {
  return `/settings/modules/${slug}`
}

function normalizeToggles(value: Partial<FeatureToggles> | undefined): FeatureToggles {
  return {
    analytics: Boolean(value?.analytics),
    reports: Boolean(value?.reports),
    export: Boolean(value?.export),
    ai_assistant: Boolean(value?.ai_assistant),
  }
}

export default function ModuleSettingsPage() {
  const params = useParams<{ module: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [modules, setModules] = useState<TenantModule[]>([])
  const [settings, setSettings] = useState<ModuleThemeSettings | null>(null)
  const [draft, setDraft] = useState<ModuleThemeSettingsInput | null>(null)
  const [loadingModules, setLoadingModules] = useState(true)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const selectedPathKey = normalizeModulePathKey(params.module)

  useEffect(() => {
    let mounted = true
    setLoadingModules(true)
    setError(null)

    getTenantModules()
      .then((rows) => {
        if (!mounted) return
        setModules(rows.filter((row) => row.is_enabled))
      })
      .catch(() => {
        if (!mounted) return
        setError('Unable to load tenant modules.')
      })
      .finally(() => {
        if (!mounted) return
        setLoadingModules(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const selectedModule = useMemo(() => {
    if (modules.length === 0) return null
    if (selectedPathKey) {
      const found = modules.find((module) => module.module_key === selectedPathKey)
      if (found) return found
    }
    return modules[0]
  }, [modules, selectedPathKey])

  useEffect(() => {
    if (!selectedModule) return
    const slug = selectedModule.module_key.toLowerCase().replace(/_/g, '-')
    const targetRoute = buildModuleSettingsRoute(slug)
    if (location.pathname.toLowerCase() !== targetRoute.toLowerCase()) {
      navigate(targetRoute, { replace: true })
    }
  }, [location.pathname, navigate, selectedModule])

  useEffect(() => {
    if (!selectedModule) return
    let mounted = true
    setLoadingSettings(true)
    setError(null)
    setStatusMessage(null)

    getTenantModuleSettings(selectedModule.module_id)
      .then((payload) => {
        if (!mounted) return
        const normalized: ModuleThemeSettings = {
          ...payload,
          feature_toggles: normalizeToggles(payload.feature_toggles),
        }
        setSettings(normalized)
        setDraft({
          theme_preset: normalized.theme_preset,
          primary_color: normalized.primary_color,
          secondary_color: normalized.secondary_color,
          sidebar_style: normalized.sidebar_style,
          feature_toggles: normalized.feature_toggles,
          config: normalized.config ?? {},
        })
      })
      .catch(() => {
        if (!mounted) return
        setError('Unable to load module settings. You may not have admin access.')
      })
      .finally(() => {
        if (!mounted) return
        setLoadingSettings(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedModule])

  const updateDraft = (patch: Partial<ModuleThemeSettingsInput>) => {
    setDraft((prev) => {
      if (!prev) return prev
      return { ...prev, ...patch }
    })
  }

  const updateToggle = (key: keyof FeatureToggles, value: boolean) => {
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        feature_toggles: {
          ...prev.feature_toggles,
          [key]: value,
        },
      }
    })
  }

  const resetDraft = () => {
    if (!settings) return
    setDraft({
      theme_preset: settings.theme_preset,
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      sidebar_style: settings.sidebar_style,
      feature_toggles: normalizeToggles(settings.feature_toggles),
      config: settings.config ?? {},
    })
    setStatusMessage('Changes reverted.')
  }

  const saveChanges = async () => {
    if (!selectedModule || !draft) return
    setSaving(true)
    setError(null)
    setStatusMessage(null)
    try {
      const updated = await updateTenantModuleSettings(selectedModule.module_id, {
        ...draft,
        feature_toggles: normalizeToggles(draft.feature_toggles),
      })
      const normalized = {
        ...updated,
        feature_toggles: normalizeToggles(updated.feature_toggles),
      }
      setSettings(normalized)
      setDraft({
        theme_preset: normalized.theme_preset,
        primary_color: normalized.primary_color,
        secondary_color: normalized.secondary_color,
        sidebar_style: normalized.sidebar_style,
        feature_toggles: normalized.feature_toggles,
        config: normalized.config ?? {},
      })
      setStatusMessage('Module settings saved successfully.')
    } catch {
      setError('Save failed. Only Tenant Admin can modify module settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loadingModules) {
    return <div className="rounded-2xl glass-panel p-6 text-sm text-slate-300">Loading modules...</div>
  }

  if (!selectedModule) {
    return <div className="rounded-2xl glass-panel p-6 text-sm text-slate-300">No assigned modules were found for this tenant.</div>
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="SETTINGS"
        badgeColor="sky"
        title="Module Settings"
        subtitle="Enable, disable and configure school modules"
        icon="⚙️"
      />
      <aside className="col-span-12 rounded-2xl glass-panel p-4 lg:col-span-4">
        <h2 className="text-sm font-semibold text-slate-100">Module Settings</h2>
        <p className="mt-1 text-xs text-slate-400">Select a module to configure its theme and feature toggles.</p>
        <div className="mt-4 space-y-2">
          {modules.map((module) => {
            const isActive = module.module_key === selectedModule.module_key
            const slug = module.module_key.toLowerCase().replace(/_/g, '-')
            return (
              <button
                key={module.module_id}
                type="button"
                onClick={() => navigate(buildModuleSettingsRoute(slug))}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                    : 'border-white/[0.09] bg-slate-950/30 text-slate-200 hover:border-slate-500'
                }`}
              >
                <p className="text-sm font-semibold">{module.module_name}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">{module.module_key}</p>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="col-span-12 space-y-5 rounded-2xl glass-panel p-5 lg:col-span-8">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Theme Configuration</p>
          <h1 className="mt-1 text-2xl font-display font-semibold text-slate-100">{selectedModule.module_name}</h1>
          <p className="mt-2 text-sm text-slate-400">These settings apply dynamically whenever users open this module.</p>
        </header>

        {loadingSettings || !draft ? (
          <div className="rounded-xl border border-white/[0.09] bg-slate-950/40 p-4 text-sm text-slate-300">Loading module settings...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Theme Preset</span>
                <select
                  value={draft.theme_preset}
                  onChange={(event) => updateDraft({ theme_preset: event.target.value as ModuleThemeSettingsInput['theme_preset'] })}
                  className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  {PRESETS.map((preset) => (
                    <option key={preset} value={preset}>{preset}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sidebar Style</span>
                <select
                  value={draft.sidebar_style}
                  onChange={(event) => updateDraft({ sidebar_style: event.target.value as ModuleThemeSettingsInput['sidebar_style'] })}
                  className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  {SIDEBARS.map((style) => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Primary Color</span>
                <input
                  type="color"
                  value={draft.primary_color}
                  onChange={(event) => updateDraft({ primary_color: event.target.value })}
                  className="h-10 w-full cursor-pointer rounded-lg border border-white/[0.09] bg-slate-950 px-1"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Secondary Color</span>
                <input
                  type="color"
                  value={draft.secondary_color}
                  onChange={(event) => updateDraft({ secondary_color: event.target.value })}
                  className="h-10 w-full cursor-pointer rounded-lg border border-white/[0.09] bg-slate-950 px-1"
                />
              </label>
            </div>

            <div className="rounded-xl border border-white/[0.09] bg-slate-950/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Feature Toggles</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(draft.feature_toggles ?? EMPTY_TOGGLES).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between rounded-lg border border-white/[0.09] glass-panel px-3 py-2">
                    <span className="text-sm text-slate-200">{key.replace('_', ' ')}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => updateToggle(key as keyof FeatureToggles, event.target.checked)}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveChanges}
                disabled={saving}
                className="rounded-xl border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={resetDraft}
                disabled={saving}
                className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:opacity-60"
              >
                Reset
              </button>
            </div>
          </>
        )}

        {error ? <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}
        {statusMessage ? <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{statusMessage}</div> : null}
      </section>
    </div>
  )
}

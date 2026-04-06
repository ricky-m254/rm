import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useModuleSettings } from '../settings/useModuleSettings'
import { getTenantModuleSettings, getTenantModules, type ModuleThemeSettings } from '../api/moduleSettings'
import { isAdminFamilyRole } from '../lib/roleCatalog'
import { useAuthStore } from '../store/auth'

function pathToModuleKey(pathname: string): string | null {
  const match = pathname.match(/^\/modules\/([^/]+)/i)
  if (!match?.[1]) return null
  return match[1].trim().replace(/-/g, '_').toUpperCase()
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { values } = useModuleSettings('global')
  const preference = typeof values.themePreference === 'string' ? values.themePreference : 'system'
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const authMode = useAuthStore((state) => state.authMode)
  const role = useAuthStore((state) => state.role)
  const [moduleTheme, setModuleTheme] = useState<ModuleThemeSettings | null>(null)
  const moduleKey = useMemo(() => pathToModuleKey(location.pathname), [location.pathname])

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const shouldUseDark =
        moduleTheme?.theme_preset === 'DARK' ||
        preference === 'dark' ||
        (preference !== 'light' && mediaQuery.matches)
      root.classList.toggle('dark', shouldUseDark)
    }

    applyTheme()
    mediaQuery.addEventListener('change', applyTheme)
    return () => {
      mediaQuery.removeEventListener('change', applyTheme)
    }
  }, [preference, moduleTheme?.theme_preset])

  useEffect(() => {
    const root = document.documentElement
    const primary = moduleTheme?.primary_color ?? '#10b981'
    const secondary = moduleTheme?.secondary_color ?? '#0ea5e9'
    root.style.setProperty('--primary-color', primary)
    root.style.setProperty('--secondary-color', secondary)
    root.dataset.sidebarStyle = moduleTheme?.sidebar_style ?? 'EXPANDED'
    root.dataset.themePreset = moduleTheme?.theme_preset ?? 'DEFAULT'
  }, [moduleTheme])

  useEffect(() => {
    const canReadTenantModuleTheme = isAdminFamilyRole(role)

    if (!isAuthenticated || authMode !== 'tenant' || !moduleKey || !canReadTenantModuleTheme) {
      setModuleTheme(null)
      return
    }

    let mounted = true
    ;(async () => {
      try {
        const modules = await getTenantModules()
        const selected = modules.find((module) => module.module_key === moduleKey)
        if (!selected) {
          if (mounted) setModuleTheme(null)
          return
        }
        const settings = await getTenantModuleSettings(selected.module_id)
        if (mounted) setModuleTheme(settings)
      } catch {
        if (mounted) setModuleTheme(null)
      }
    })()

    return () => {
      mounted = false
    }
  }, [authMode, isAuthenticated, moduleKey, role])

  return <>{children}</>
}

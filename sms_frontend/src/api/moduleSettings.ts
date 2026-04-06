import { apiClient } from './client'

export type ThemePreset = 'DEFAULT' | 'MODERN' | 'CLASSIC' | 'MINIMAL' | 'DARK'
export type SidebarStyle = 'COLLAPSED' | 'EXPANDED' | 'ICON_ONLY'

export type FeatureToggles = {
  analytics: boolean
  reports: boolean
  export: boolean
  ai_assistant: boolean
}

export type TenantModule = {
  id: number
  module_id: number
  module_key: string
  module_name: string
  is_enabled: boolean
  sort_order: number
  updated_at: string
  settings?: ModuleThemeSettings
}

export type ModuleThemeSettings = {
  id: number
  theme_preset: ThemePreset
  primary_color: string
  secondary_color: string
  sidebar_style: SidebarStyle
  feature_toggles: FeatureToggles
  config: Record<string, unknown>
  updated_at: string
}

export type ModuleThemeSettingsInput = Omit<ModuleThemeSettings, 'id' | 'updated_at'>

type TenantModulesPayload =
  | { count: number; results: TenantModule[] }
  | TenantModule[]

export async function getTenantModules(): Promise<TenantModule[]> {
  const response = await apiClient.get<TenantModulesPayload>('/tenant/modules')
  const data = response.data
  if (Array.isArray(data)) return data
  return Array.isArray(data.results) ? data.results : []
}

export async function getTenantModuleSettings(moduleId: number): Promise<ModuleThemeSettings> {
  const response = await apiClient.get<ModuleThemeSettings>(`/tenant/modules/${moduleId}/settings`)
  return response.data
}

export async function updateTenantModuleSettings(
  moduleId: number,
  payload: ModuleThemeSettingsInput,
): Promise<ModuleThemeSettings> {
  const response = await apiClient.put<ModuleThemeSettings>(`/tenant/modules/${moduleId}/settings`, payload)
  return response.data
}

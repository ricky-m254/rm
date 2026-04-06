export type SettingType = 'boolean' | 'string' | 'number' | 'select' | 'percentage'

export type SettingOption = {
  value: string
  label: string
}

export type SettingDefinition = {
  key: string
  label: string
  description?: string
  type: SettingType
  defaultValue: boolean | string | number
  options?: SettingOption[]
  requiredPermission?: string
}

export type SettingsSchema = {
  module: string
  title: string
  description?: string
  settings: SettingDefinition[]
}

export type SettingValue = boolean | string | number

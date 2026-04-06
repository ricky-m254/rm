import type { SettingsSchema } from '../types'

const globalSettings: SettingsSchema = {
  module: 'global',
  title: 'Global Settings',
  description: 'School-wide configuration applied across all modules.',
  settings: [
    {
      key: 'themePreference',
      label: 'Theme Preference',
      description: 'Choose the appearance mode used across the app.',
      type: 'select',
      defaultValue: 'system',
      options: [
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ],
    },
    {
      key: 'schoolTimezone',
      label: 'School Timezone',
      description: 'Default timezone used for dates and schedules.',
      type: 'string',
      defaultValue: 'Africa/Nairobi',
    },
  ],
}

export default globalSettings

import type { SettingsSchema } from '../types'

const parentSettings: SettingsSchema = {
  module: 'parents',
  title: 'Parent Settings',
  description: 'Communication preferences for guardians and parents.',
  settings: [
    {
      key: 'allowParentPortal',
      label: 'Enable Parent Portal',
      description: 'Allow parents to access the portal.',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'defaultNotificationChannel',
      label: 'Default Notification Channel',
      description: 'Primary channel for parent communications.',
      type: 'select',
      defaultValue: 'sms',
      options: [
        { value: 'sms', label: 'SMS' },
        { value: 'email', label: 'Email' },
      ],
    },
  ],
}

export default parentSettings

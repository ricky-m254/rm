import type { SettingsSchema } from '../types'

const staffSettings: SettingsSchema = {
  module: 'staff',
  title: 'Staff Settings',
  description: 'Staff onboarding and HR preferences.',
  settings: [
    {
      key: 'requireStaffId',
      label: 'Require Staff ID',
      description: 'Enforce unique staff ID on onboarding.',
      type: 'boolean',
      defaultValue: true,
    },
  ],
}

export default staffSettings

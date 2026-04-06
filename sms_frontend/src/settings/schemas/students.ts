import type { SettingsSchema } from '../types'

const studentSettings: SettingsSchema = {
  module: 'students',
  title: 'Student Settings',
  description: 'Enrollment and student profile preferences.',
  settings: [
    {
      key: 'autoAssignAdmissionNumber',
      label: 'Auto-assign Admission Numbers',
      description: 'Generate admission numbers automatically on enrollment.',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'requireGuardianContact',
      label: 'Require Guardian Contact',
      description: 'Prevent enrollment without guardian phone or email.',
      type: 'boolean',
      defaultValue: true,
    },
  ],
}

export default studentSettings

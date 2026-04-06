import type { SettingsSchema } from '../types'

const academicsSettings: SettingsSchema = {
  module: 'academics',
  title: 'Academics Settings',
  description: 'Academic year, grading, and timetable preferences.',
  settings: [
    {
      key: 'gradingScale',
      label: 'Grading Scale',
      description: 'Default grading scale used across classes.',
      type: 'string',
      defaultValue: 'A-F',
    },
  ],
}

export default academicsSettings

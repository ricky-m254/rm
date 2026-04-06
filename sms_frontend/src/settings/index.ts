import type { SettingsSchema } from './types'
import globalSettings from './schemas/global'
import financeSettings from './schemas/finance'
import studentSettings from './schemas/students'
import parentSettings from './schemas/parents'
import academicsSettings from './schemas/academics'
import staffSettings from './schemas/staff'
import communicationSettings from './schemas/communication'
import { isSettingsKeyEnabled } from '../config/moduleFocus'

export const settingsSchemas: Record<string, SettingsSchema> = {
  global: globalSettings,
  finance: financeSettings,
  students: studentSettings,
  parents: parentSettings,
  academics: academicsSettings,
  staff: staffSettings,
  communication: communicationSettings,
}

const ALL_SETTINGS_SIDEBAR = [
  { key: 'global', label: 'Global Settings' },
  { key: 'finance', label: 'Finance Settings' },
  { key: 'students', label: 'Student Settings' },
  { key: 'parents', label: 'Parent Settings' },
  { key: 'academics', label: 'Academics Settings' },
  { key: 'staff', label: 'Staff Settings' },
  { key: 'communication', label: 'Communication Settings' },
  { key: 'users', label: 'User Management' },
  { key: 'roles', label: 'Roles & Permissions' },
]

export const settingsSidebar = ALL_SETTINGS_SIDEBAR.filter((item) => isSettingsKeyEnabled(item.key))

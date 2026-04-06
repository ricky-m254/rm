const parseCsvEnv = (value: string | undefined) =>
  new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.toLowerCase()),
  )

const DEFAULT_BACKEND_MODULE_KEYS = new Set([
  'core',
  'students',
  'admissions',
  'finance',
  'academics',
  'hr',
  'staff',
  'communication',
  'library',
  'parents',
  'assets',
  'store',
  'dispensary',
  'clockin',
  'timetable',
  'transport',
  'visitor_mgmt',
  'examinations',
  'alumni',
  'hostel',
  'ptm',
  'sports',
  'cafeteria',
  'curriculum',
  'maintenance',
  'elearning',
  'analytics',
  'reporting',
])

const DEFAULT_ROUTE_KEYS = new Set([
  'students',
  'admissions',
  'finance',
  'reporting',
  'parents',
  'parent-portal',
  'academics',
  'hr',
  'staff',
  'communication',
  'library',
  'assets',
  'settings',
  'store',
  'dispensary',
  'clockin',
  'timetable',
  'transport',
  'visitors',
  'examinations',
  'alumni',
  'hostel',
  'ptm',
  'sports',
  'cafeteria',
  'curriculum',
  'maintenance',
  'elearning',
  'analytics',
])

const DEFAULT_SETTINGS_KEYS = new Set([
  'global',
  'finance',
  'students',
  'academics',
  'communication',
  'parents',
  'staff',
  'users',
  'roles',
])

const envBackendKeys = parseCsvEnv(import.meta.env.VITE_ENABLED_BACKEND_MODULE_KEYS)
const envRouteKeys = parseCsvEnv(import.meta.env.VITE_ENABLED_ROUTE_KEYS)
const envSettingsKeys = parseCsvEnv(import.meta.env.VITE_ENABLED_SETTINGS_KEYS)

const ENABLED_BACKEND_MODULE_KEYS = envBackendKeys.size > 0 ? envBackendKeys : DEFAULT_BACKEND_MODULE_KEYS
const ENABLED_ROUTE_KEYS = envRouteKeys.size > 0 ? envRouteKeys : DEFAULT_ROUTE_KEYS
const ENABLED_SETTINGS_KEYS = envSettingsKeys.size > 0 ? envSettingsKeys : DEFAULT_SETTINGS_KEYS

export const isBackendModuleEnabled = (moduleKey: string) =>
  ENABLED_BACKEND_MODULE_KEYS.has((moduleKey || '').toLowerCase())

export const isModuleRouteEnabled = (routeKey: string) =>
  ENABLED_ROUTE_KEYS.has((routeKey || '').toLowerCase())

export const isSettingsKeyEnabled = (settingsKey: string) =>
  ENABLED_SETTINGS_KEYS.has((settingsKey || '').toLowerCase())

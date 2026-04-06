import { create } from 'zustand'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  tenantId: string | null
  authMode: 'tenant' | 'platform'
  username: string | null
  role: string | null
  permissions: string[]
  /** Module keys this user is allowed to access, sourced from /api/auth/me/ */
  assignedModules: string[]
  /** All roles available to this user (for multi-role accounts) */
  availableRoles: string[]
  isAuthenticated: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  setTenant: (tenantId: string | null) => void
  setAuthMode: (mode: 'tenant' | 'platform') => void
  setUsername: (username: string | null) => void
  setRole: (role: string | null) => void
  setPermissions: (permissions: string[]) => void
  setAssignedModules: (modules: string[]) => void
  setAvailableRoles: (roles: string[]) => void
  logout: () => void
}

const ACCESS_TOKEN_KEY      = 'sms_access_token'
const REFRESH_TOKEN_KEY     = 'sms_refresh_token'
const TENANT_ID_KEY         = 'sms_tenant_id'
const AUTH_MODE_KEY         = 'sms_auth_mode'
const USERNAME_KEY          = 'sms_username'
const ROLE_KEY              = 'sms_role'
const PERMISSIONS_KEY       = 'sms_permissions'
const ASSIGNED_MODULES_KEY  = 'sms_assigned_modules'
const AVAILABLE_ROLES_KEY   = 'sms_available_roles'

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const accessToken  = readStorage(ACCESS_TOKEN_KEY)
  const refreshToken = readStorage(REFRESH_TOKEN_KEY)
  const tenantId     = readStorage(TENANT_ID_KEY)
  const authMode     = readStorage(AUTH_MODE_KEY) === 'platform' ? 'platform' : 'tenant'
  const username     = readStorage(USERNAME_KEY)
  const role         = readStorage(ROLE_KEY)

  const parseJsonArray = (raw: string | null): string[] => {
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter(item => typeof item === 'string') as string[]
    } catch { /* ignore */ }
    return raw.split(',').map(item => item.trim()).filter(Boolean)
  }

  const permissions      = parseJsonArray(readStorage(PERMISSIONS_KEY))
  const assignedModules  = parseJsonArray(readStorage(ASSIGNED_MODULES_KEY))
  const availableRoles   = parseJsonArray(readStorage(AVAILABLE_ROLES_KEY))

  return {
    accessToken,
    refreshToken,
    tenantId,
    authMode,
    username,
    role,
    permissions,
    assignedModules,
    availableRoles,
    isAuthenticated: Boolean(accessToken),
    setTokens: (nextAccess, nextRefresh) => {
      writeStorage(ACCESS_TOKEN_KEY, nextAccess)
      writeStorage(REFRESH_TOKEN_KEY, nextRefresh)
      set({
        accessToken: nextAccess,
        refreshToken: nextRefresh,
        isAuthenticated: Boolean(nextAccess),
      })
    },
    setTenant: (nextTenant) => {
      writeStorage(TENANT_ID_KEY, nextTenant)
      set({ tenantId: nextTenant })
    },
    setAuthMode: (mode) => {
      writeStorage(AUTH_MODE_KEY, mode)
      set({ authMode: mode })
    },
    setUsername: (nextUsername) => {
      writeStorage(USERNAME_KEY, nextUsername)
      set({ username: nextUsername })
    },
    setRole: (nextRole) => {
      writeStorage(ROLE_KEY, nextRole)
      set({ role: nextRole })
    },
    setPermissions: (nextPermissions) => {
      writeStorage(PERMISSIONS_KEY, JSON.stringify(nextPermissions))
      set({ permissions: nextPermissions })
    },
    setAssignedModules: (nextModules) => {
      writeStorage(ASSIGNED_MODULES_KEY, JSON.stringify(nextModules))
      set({ assignedModules: nextModules })
    },
    setAvailableRoles: (nextRoles) => {
      writeStorage(AVAILABLE_ROLES_KEY, JSON.stringify(nextRoles))
      set({ availableRoles: nextRoles })
    },
    logout: () => {
      writeStorage(ACCESS_TOKEN_KEY, null)
      writeStorage(REFRESH_TOKEN_KEY, null)
      writeStorage(TENANT_ID_KEY, null)
      writeStorage(AUTH_MODE_KEY, null)
      writeStorage(USERNAME_KEY, null)
      writeStorage(ROLE_KEY, null)
      writeStorage(PERMISSIONS_KEY, null)
      writeStorage(ASSIGNED_MODULES_KEY, null)
      writeStorage(AVAILABLE_ROLES_KEY, null)
      set({
        accessToken: null,
        refreshToken: null,
        tenantId: null,
        authMode: 'tenant',
        username: null,
        role: null,
        permissions: [],
        assignedModules: [],
        availableRoles: [],
        isAuthenticated: false,
      })
    },
  }
})

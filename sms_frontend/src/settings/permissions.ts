export type CurrentUser = {
  id: string
  name: string
  permissions: string[]
}

const DEFAULT_PERMISSIONS = ['settings:view', 'settings:debug', 'finance:settings:view']

const readString = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const readPermissions = () => {
  const stored = readString('sms_permissions')
  if (!stored) return null
  try {
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string') as string[]
    }
  } catch {
    // fall through
  }
  return stored
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const readUserFromStorage = (): CurrentUser => {
  const username = readString('sms_username') ?? 'Demo Admin'
  const storedUser = readString('sms_user')
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser) as { id?: string; username?: string; permissions?: string[] }
      const permissions = parsed.permissions ?? readPermissions() ?? DEFAULT_PERMISSIONS
      return {
        id: parsed.id ?? username,
        name: parsed.username ?? username,
        permissions,
      }
    } catch {
      // ignore parsing errors
    }
  }
  return {
    id: username,
    name: username,
    permissions: readPermissions() ?? DEFAULT_PERMISSIONS,
  }
}

export const useCurrentUser = () => readUserFromStorage()

export const hasPermission = (user: CurrentUser, permission?: string) => {
  if (!permission) return true
  return user.permissions.includes(permission)
}

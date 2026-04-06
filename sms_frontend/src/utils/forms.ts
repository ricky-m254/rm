export const extractApiErrorMessage = (err: unknown, fallback = 'Something went wrong.'): string => {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (!data || typeof data !== 'object') return fallback

  const keys = ['detail', 'error', 'message', 'non_field_errors'] as const
  for (const key of keys) {
    const value = (data as Record<string, unknown>)[key]
    if (Array.isArray(value) && value.length > 0) return String(value[0])
    if (typeof value === 'string' && value.trim()) return value
  }

  const first = Object.values(data as Record<string, unknown>).find((value) =>
    Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0,
  )
  if (Array.isArray(first) && first.length > 0) return String(first[0])
  if (typeof first === 'string') return first
  return fallback
}

export const mapApiFieldErrors = (
  err: unknown,
  fields: string[],
): Record<string, string> => {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (!data || typeof data !== 'object') return {}

  const nextErrors: Record<string, string> = {}
  fields.forEach((key) => {
    const value = (data as Record<string, unknown>)[key]
    if (Array.isArray(value) && value.length > 0) {
      nextErrors[key] = value.map(String).join(' ')
      return
    }
    if (typeof value === 'string' && value.trim()) {
      nextErrors[key] = value
    }
  })
  return nextErrors
}

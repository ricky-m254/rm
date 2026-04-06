export function getParentPortalErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const data = (error.response as { data?: Record<string, unknown> }).data
    if (typeof data?.error === 'string') return data.error
    if (typeof data?.detail === 'string') return data.detail
  }

  return fallback
}

/**
 * Resolve a potentially relative file/media URL to an absolute URL.
 * Django backend serves uploaded files at /media/... — in development
 * these must be prefixed with the backend origin so the browser fetches
 * them correctly (the Vite proxy forwards /media/* to localhost:8000).
 * External http/https URLs are returned unchanged.
 */
export function resolveFileUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // Relative path (e.g. /media/uploads/file.pdf) → prepend origin
  const origin =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : ''
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`
}

export function resolveApiBaseUrl(): string {
  const forcedBase = import.meta.env.VITE_FORCE_API_BASE_URL?.trim()
  if (forcedBase) {
    return forcedBase
  }

  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configuredBase) {
    return configuredBase
  }

  // In production, frontend and backend are served from the same origin.
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`
  }

  // In development, use an empty base so all /api calls are relative.
  // Vite's dev server proxies /api/* → localhost:8000 (see vite.config.ts).
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`
  }

  return ''
}

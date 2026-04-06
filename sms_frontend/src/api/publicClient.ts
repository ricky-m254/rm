import axios from 'axios'
import { useAuthStore } from '../store/auth'
import { resolveApiBaseUrl } from './baseUrl'

export const publicApiClient = axios.create({
  baseURL: `${resolveApiBaseUrl().replace(/\/$/, '')}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

publicApiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let isRefreshing = false
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void }
let pendingQueue: QueueEntry[] = []

const flushQueue = (err: unknown, token: string | null) => {
  pendingQueue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token!)))
  pendingQueue = []
}

publicApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (
      error?.response?.status === 401 &&
      !original._retry &&
      !String(original.url ?? '').includes('/auth/login/') &&
      !String(original.url ?? '').includes('/auth/refresh/')
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers = original.headers ?? {}
          original.headers.Authorization = `Bearer ${token}`
          return publicApiClient(original)
        })
      }
      original._retry = true
      isRefreshing = true
      const { refreshToken, setTokens, logout } = useAuthStore.getState()
      if (!refreshToken) {
        logout()
        window.location.href = '/platform/login'
        return Promise.reject(error)
      }
      try {
        const base = resolveApiBaseUrl().replace(/\/$/, '')
        const resp = await axios.post(
          `${base}/api/auth/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        )
        const newAccess: string = resp.data.access
        const newRefresh: string = resp.data.refresh ?? refreshToken
        setTokens(newAccess, newRefresh)
        flushQueue(null, newAccess)
        original.headers = original.headers ?? {}
        original.headers.Authorization = `Bearer ${newAccess}`
        return publicApiClient(original)
      } catch (refreshErr) {
        flushQueue(refreshErr, null)
        logout()
        window.location.href = '/platform/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Phase 15 — Prompt 69: usePermissions hook.
 *
 * Fetches and caches the authenticated user's effective RBAC permissions
 * from GET /rbac/users/{id}/permissions/
 *
 * Returns:
 *   - permissions: Set<string>   (e.g. "finance.invoice.read")
 *   - loading: boolean
 *   - hasPermission(name): boolean
 *   - hasAnyPermission(names): boolean
 *   - hasAllPermissions(names): boolean
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';
import { isAdminFamilyRole } from '../lib/roleCatalog';
import { useAuthStore } from '../store/auth';

interface UsePermissionsResult {
  permissions: Set<string>;
  loading: boolean;
  hasPermission: (name: string) => boolean;
  hasAnyPermission: (names: string[]) => boolean;
  hasAllPermissions: (names: string[]) => boolean;
  refresh: () => void;
}

const CACHE_KEY = 'rbac_permissions';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  permissions: string[];
  expiresAt: number;
}

function readCache(): Set<string> | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return new Set(entry.permissions);
  } catch {
    return null;
  }
}

function writeCache(permissions: string[]): void {
  try {
    const entry: CacheEntry = {
      permissions,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage unavailable — skip caching
  }
}

export function clearPermissionsCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

export function usePermissions(): UsePermissionsResult {
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(0);
  const role = useAuthStore(s => s.role);

  const fetchPermissions = useCallback(async () => {
    // Admin and super-admin bypass all permission checks — grant wildcard immediately
    if (isAdminFamilyRole(role)) {
      // Clear any stale cache that might have been stored with empty permissions
      sessionStorage.removeItem(CACHE_KEY);
      setPermissions(new Set(['*']));
      setLoading(false);
      return;
    }

    const cached = readCache();
    if (cached) {
      setPermissions(cached);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    // Get current user id from JWT payload (without library)
    let userId: number | null = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.user_id ?? payload.id ?? null;
    } catch {
      // malformed token
    }

    if (!userId) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    const callId = ++fetchRef.current;
    try {
      const res = await apiClient.get(`/rbac/users/${userId}/permissions/`);
      if (callId !== fetchRef.current) return; // stale

      const perms: string[] = res.data?.permissions ?? [];
      writeCache(perms);
      setPermissions(new Set(perms));
    } catch {
      // RBAC endpoint unavailable — fail open (show all)
      setPermissions(new Set(['*']));
    } finally {
      if (callId === fetchRef.current) {
        setLoading(false);
      }
    }
  }, [role]);

  useEffect(() => {
    setLoading(true);
    void fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (name: string) => {
      if (permissions.has('*')) return true; // admin wildcard / fail-open
      return permissions.has(name);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (names: string[]) => names.some((n) => hasPermission(n)),
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (names: string[]) => names.every((n) => hasPermission(n)),
    [hasPermission]
  );

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refresh: fetchPermissions,
  };
}

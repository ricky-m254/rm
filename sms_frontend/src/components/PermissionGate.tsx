/**
 * Phase 15 — Prompt 69: PermissionGate component.
 * Phase 16 UX — Show/hide UI elements based on user RBAC permissions.
 *
 * Usage:
 *   <PermissionGate permission="finance.invoice.create">
 *     <button>Add Invoice</button>
 *   </PermissionGate>
 *
 *   <PermissionGate anyOf={["students.student.create", "students.student.update"]}>
 *     <ActionButtons />
 *   </PermissionGate>
 *
 *   <PermissionGate permission="finance.report.read" fallback={<p>No access</p>}>
 *     <FinanceReport />
 *   </PermissionGate>
 */
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGateProps {
  /** Single required permission (AND logic when combined with anyOf/allOf). */
  permission?: string;
  /** User must have AT LEAST ONE of these permissions. */
  anyOf?: string[];
  /** User must have ALL of these permissions. */
  allOf?: string[];
  /** Content shown when permission check fails (default: null = hidden). */
  fallback?: React.ReactNode;
  /** Children shown when the user has the required permission(s). */
  children: React.ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  // While loading, show nothing (avoids flash of unauthorized content)
  if (loading) return null;

  let allowed = true;

  if (permission) {
    allowed = allowed && hasPermission(permission);
  }
  if (anyOf && anyOf.length > 0) {
    allowed = allowed && hasAnyPermission(anyOf);
  }
  if (allOf && allOf.length > 0) {
    allowed = allowed && hasAllPermissions(allOf);
  }

  return <>{allowed ? children : fallback}</>;
};

export default PermissionGate;

/**
 * Hook variant — useful for imperative checks in event handlers.
 *
 * Usage:
 *   const { can } = usePermissionCheck();
 *   if (can('finance.invoice.delete')) { ... }
 */
export function usePermissionCheck() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();
  return {
    can: hasPermission,
    canAny: hasAnyPermission,
    canAll: hasAllPermissions,
    loading,
  };
}

'use client'

import { createContext, useContext, ReactNode } from 'react'
import { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin, UserContext } from './permissions'

interface AuthContextValue {
  user: any
  permissions: string[]
  isSuperAdmin: boolean
  can: (permKey: string) => boolean
  canAny: (permKeys: string[]) => boolean
  canAll: (permKeys: string[]) => boolean
}

const AuthCtx = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  children,
  user,
  permissions
}: {
  children: ReactNode
  user: any
  permissions: string[]
}) {
  const ctx: UserContext = {
    is_super_admin: user?.is_super_admin,
    permissions,
    roles: user?.roles || []
  }

  const value: AuthContextValue = {
    user,
    permissions,
    isSuperAdmin: isSuperAdmin(ctx),
    can: (permKey: string) => hasPermission(ctx, permKey),
    canAny: (permKeys: string[]) => hasAnyPermission(ctx, permKeys),
    canAll: (permKeys: string[]) => hasAllPermissions(ctx, permKeys)
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

/**
 * Hook untuk akses permissions di komponen manapun
 * 
 * @example
 * const { can, isSuperAdmin } = useAuth()
 * if (can('karyawan_edit')) { ... }
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx)
  if (!ctx) {
    // Fallback aman jika dipakai di luar Provider
    return {
      user: null,
      permissions: [],
      isSuperAdmin: false,
      can: () => false,
      canAny: () => false,
      canAll: () => false
    }
  }
  return ctx
}
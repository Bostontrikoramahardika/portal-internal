'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { AuthProvider } from '@/app/lib/AuthContext'
import { saveUserCache, getUserCache, isCacheValid, saveMenusCache, getMenusCache } from '@/app/lib/auth-cache'
import { initAutoSync } from '@/app/lib/sync-manager'
import SyncIndicator from '@/app/dashboard/components/SyncIndicator'
import ClockOutReminder from '@/app/dashboard/components/ClockOutReminder'
import VerificationModal from '@/app/dashboard/components/VerificationModal'

interface User {
  nrp: string
  nrp_login?: string
  nama: string
  jabatan?: string
  departemen?: string
  site?: string
}

interface MenuItem {
  id: string
  role: string
  menu_key: string
  menu_label: string
  menu_icon: string
  menu_group: string
  sort_order: number
  active?: boolean
}

// ═══════════════════════════════════════════════════
// 🎯 ROLE GROUPING v2.0 (14 role baru + legacy)
// ═══════════════════════════════════════════════════

// Semua role yang bisa akses aplikasi (untuk tab basic)
const ALL_ROLES = [
  // Role baru
  'super_admin', 'director_ops', 'business_dev', 'manager_ops',
  'hr_ho', 'spv_she_ho', 'pjo_site', 'she_site', 'hr_site',
  'gl_produksi', 'gl_plant', 'admin_site', 'admin_plant', 'employee',
  // Legacy
  'karyawan', 'atasan', 'pjo', 'admin', 'hrga',
  'hrga_oprek', 'hrga_site', 'hrga_pusat'
]

// Role yang punya bawahan (untuk tab TIM)
const TEAM_LEADER_ROLES = [
  'super_admin', 'director_ops', 'manager_ops', 'business_dev',
  'hr_ho', 'spv_she_ho', 'pjo_site', 'she_site', 'hr_site',
  'gl_produksi', 'gl_plant', 'admin_site', 'admin_plant',
  // Legacy
  'atasan', 'pjo', 'admin', 'hrga', 'hrga_oprek', 'hrga_site', 'hrga_pusat'
]

// Role yang bisa approve
const APPROVER_ROLES = [
  'super_admin', 'hr_ho', 'pjo_site', 'hr_site',
  'gl_produksi', 'gl_plant',
  // Legacy
  'atasan', 'pjo', 'hrga', 'admin', 'admin_site', 'hrga_site', 'hrga_oprek'
]

// Role HO Executive (monitor only, view all)
const HO_EXECUTIVE_ROLES = [
  'director_ops', 'business_dev', 'manager_ops', 'spv_she_ho'
]

// Role yang bisa kelola master data
const MASTER_DATA_ROLES = [
  'super_admin', 'hr_ho', 'hr_site',
  // Legacy
  'hrga', 'admin', 'hrga_oprek', 'hrga_site', 'hrga_pusat'
]

// Role yang bisa import excel
const IMPORT_ROLES = [
  'super_admin', 'hr_ho', 'hr_site',
  // Legacy
  'hrga', 'admin', 'hrga_oprek', 'hrga_site', 'hrga_pusat'
]

// Role yang bisa lihat data expired
const DATA_MONITOR_ROLES = [
  'super_admin', 'director_ops', 'business_dev', 'manager_ops',
  'hr_ho', 'spv_she_ho', 'pjo_site', 'she_site', 'hr_site',
  'admin_site', 'admin_plant',
  // Legacy
  'atasan', 'pjo', 'admin', 'hrga', 'hrga_oprek', 'hrga_site', 'hrga_pusat'
]

// Role yang bisa akses menu Plant (Katalog Part, Order, Admin Partbook)
const PLANT_ROLES = [
  'super_admin','admin_plant','gl_plant','pjo_site',
  'manager_ops','director_ops','business_dev','hr_ho'
]

const TAB_CONFIG = [
  // TAB 1: ABSENSI
  {
    key: 'absensi',
    label: 'Absensi',
    icon: '⏰',
    roles: ALL_ROLES,
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'absensi_saya' ||
        m.menu_key === 'riwayat_absensi' ||
        m.menu_key === 'kelola_absensi' ||
        m.menu_key === 'import_roster' ||
        m.menu_key === 'export_absensi_matrix' ||
        m.menu_key === 'manajemen_absensi' ||
m.menu_key === 'rekap_absensi' ||
m.menu_key === 'koreksi_absensi'
      )
    }
  },

  // TAB 2: PENGAJUAN
  {
    key: 'pengajuan',
    label: 'Pengajuan',
    icon: '📋',
    roles: ALL_ROLES,
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'form_cuti' ||
        m.menu_key === 'form_lembur' ||
        m.menu_key === 'evident_sakit' ||
        m.menu_key === 'kelola_cuti' ||
        m.menu_key === 'kelola_lembur'
      )
    }
  },

  // TAB 3: DATA / MONITORING
  {
    key: 'data',
    label: 'Data',
    icon: '📁',
    roles: DATA_MONITOR_ROLES,
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'monitoring_expired' ||
        m.menu_key === 'monitoring_cuti_tiket' ||
        m.menu_key === 'monitoring_roster_cr'
      )
    }
  },

  // TAB 4: TIM
  {
    key: 'data_bawahan',
    label: 'Tim',
    icon: '👥',
    roles: TEAM_LEADER_ROLES,
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'data_bawahan' ||
        m.menu_key === 'cuti_bawahan' ||
        m.menu_key === 'roster_bawahan' ||
        m.menu_key === 'absensi_bawahan' ||
        m.menu_key === 'kpi_bawahan' ||
        m.menu_key === 'penilaian_bawahan'
      )
    }
  },

  // TAB 5: APPROVAL
  {
    key: 'approval',
    label: 'Approval',
    icon: '✅',
    roles: APPROVER_ROLES,
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'approval_center' ||
        m.menu_key === 'riwayat_approval' ||
        m.menu_key === 'approval_koreksi'
      )
    }
  },

  // TAB 6: KELOLA
  {
    key: 'kelola_hrga',
    label: 'Kelola',
    icon: '🛠️',
    roles: MASTER_DATA_ROLES,
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'kelola_karyawan' ||
        m.menu_key === 'kelola_roles' ||
        m.menu_key === 'role_manager' ||
        m.menu_key === 'kelola_kpi' ||
        m.menu_key === 'kelola_apd' ||
        m.menu_key === 'kelola_pkwt' ||
        m.menu_key === 'kelola_sp' ||
        m.menu_key === 'kelola_bpjs' ||
        m.menu_key === 'kelola_mcu' ||
        m.menu_key === 'kelola_simper' ||
        m.menu_key === 'kelola_roster' ||
        m.menu_key === 'kelola_pengumuman' ||
        m.menu_key === 'kelola_bobot_kpi' ||
        m.menu_key === 'kelola_site_master' ||
        m.menu_key === 'kelola_job_kategori' ||
        m.menu_key === 'kelola_hak_cuti' ||
        m.menu_key === 'data_sakit' ||
        m.menu_key === 'hr_override_absensi' ||
        m.menu_key === 'monitoring_mcu' ||
        m.menu_key === 'monitoring_apd'
      )
    }
  },

  // TAB 7: IMPORT (EXCEL)
  {
    key: 'import_export',
    label: 'Import',
    icon: '📥',
    roles: IMPORT_ROLES,
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'import_karyawan' ||
        m.menu_key === 'import_apd' ||
        m.menu_key === 'import_pkwt' ||
        m.menu_key === 'import_kpi' ||
        m.menu_key === 'import_sp' ||
        m.menu_key === 'import_bpjs' ||
        m.menu_key === 'import_mcu' ||
        m.menu_key === 'import_mcu_bulk' ||  // 🆕 Bulk import auto-fill
        m.menu_key === 'import_simper'
      )
    }
  },

  // TAB 8: PROFILE
  {
    key: 'profile',
    label: 'Profile',
    icon: '👤',
    roles: ALL_ROLES,
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'data_saya' ||
        m.menu_key === 'kpi_saya' ||
        m.menu_key === 'mcu_saya' ||
        m.menu_key === 'apd_saya' ||      // ← BARU
        m.menu_key === 'ganti_password'
      )
    }
  },

  // TAB 9: SYSTEM (Super Admin only)
  {
    key: 'system_config',
    label: 'System',
    icon: '⚙️',
    roles: [],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'manage_permissions' ||
        m.menu_key === 'system_audit' ||
        m.menu_key === 'config_global' ||
        m.menu_key === 'reset_password_admin'
      )
    }
  },



    // TAB 10: PLANT (Katalog, Order, Admin Partbook, Dokumen)
  {
    key: 'plant',
    label: 'Plant',
    icon: '🚜',
    roles: PLANT_ROLES,
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'plant_katalog' ||
        m.menu_key === 'plant_orders' ||
        m.menu_key === 'plant_admin' 
      )
    }
  },
]





export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">Memuat...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false) // State baru
  const [userPermissions, setUserPermissions] = useState<string[]>([]) // State baru
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('absensi')
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [bottomSheetMenus, setBottomSheetMenus] = useState<MenuItem[]>([])
  const [bottomSheetTitle, setBottomSheetTitle] = useState('')
  const [notifCount, setNotifCount] = useState(0)
const [notifData, setNotifData] = useState<any>({ approval: { total: 0, breakdown: [] }, expired: { total: 0, critical: 0, breakdown: [] } })
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const activeMenu = searchParams.get('menu') || 'absensi_saya'

  useEffect(() => { 
    checkAuth()
    fetchNotif()
    initAutoSync()

    // ✨ Dengerin sinyal dari halaman approval untuk update lonceng
    window.addEventListener('refreshNotif', fetchNotif);
    return () => window.removeEventListener('refreshNotif', fetchNotif);
  }, [])

  useEffect(() => {
    if (menus.length > 0) {
      const tab = TAB_CONFIG.find(t => {
        const matched = menus.filter(m => t.customMatch && t.customMatch(m))
        return matched.some(m => m.menu_key === activeMenu)
      })
      if (tab) setActiveTab(tab.key)
    }
  }, [activeMenu, menus])

    // ── ✨ Silent role check di background (tidak block UI) ──
  async function silentRoleCheck(cachedUser: any) {
    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('btm_session_token_v1')
        : null

      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/auth/me', {
        headers,
        signal: AbortSignal.timeout(5000)
      })

      if (!res.ok) return  // silent fail, tidak ganggu user

      const fresh = await res.json()
      if (!fresh.user) return

      // Bandingkan roles cache vs fresh
      const cachedRoles = new Set((cachedUser.roles || []).sort())
      const freshRoles  = new Set((fresh.roles || []).sort())

      const rolesChanged =
        cachedRoles.size !== freshRoles.size ||
        [...cachedRoles].some(r => !freshRoles.has(r as string)) ||
        [...freshRoles].some(r => !cachedRoles.has(r as string))

      // Bandingkan permissions
      const cachedPerms = new Set((cachedUser.permissions || []).sort())
      const freshPerms  = new Set((fresh.permissions || []).sort())

      const permsChanged =
        cachedPerms.size !== freshPerms.size ||
        [...cachedPerms].some(p => !freshPerms.has(p as string)) ||
        [...freshPerms].some(p => !cachedPerms.has(p as string))

      // Bandingkan super admin status
      const superChanged = 
        Boolean(cachedUser.is_super_admin) !== Boolean(fresh.user.is_super_admin)

      // Kalau ada perubahan → auto refresh
      if (rolesChanged || permsChanged || superChanged) {
        console.log('🔄 Roles/Permissions berubah → auto refresh')
        console.log('Cached roles:', [...cachedRoles])
        console.log('Fresh roles:',  [...freshRoles])

        // Update cache dengan data fresh
        const newUserData = {
          ...fresh.user,
          roles: fresh.roles || [],
          permissions: fresh.permissions || []
        }
        saveUserCache(newUserData)

        // Fetch menus baru juga
        try {
          const menuRes = await fetch('/api/menus', {
            headers,
            signal: AbortSignal.timeout(5000)
          })
          if (menuRes.ok) {
            const menuData = await menuRes.json()
            const menusArr = Array.isArray(menuData) 
              ? menuData 
              : (menuData.menus || menuData.data || [])
            const filtered = menusArr.filter((m: MenuItem) => {
              if (m.active === false) return false
              if (fresh.user?.is_super_admin) return true
              if (m.role === '*') return true                       // ← BARU
              return (fresh.roles || []).includes(m.role)
            })
            saveMenusCache({ menus: filtered })

            // Update juga cache lama
            if (typeof window !== 'undefined') {
              localStorage.setItem('btm_menus_v1', JSON.stringify(filtered))
              localStorage.setItem('btm_menus_time_v1', Date.now().toString())
            }
          }
        } catch {}

        // Tampilkan notif kecil
        showRoleUpdateNotification()

        // Reload halaman setelah 1.5 detik biar user sadar
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (err) {
      // Silent fail, tidak ganggu user
      console.debug('Silent role check gagal (tidak masalah)')
    }
  }

  // Notifikasi kecil di kanan atas
  function showRoleUpdateNotification() {
    if (typeof window === 'undefined') return

    const notif = document.createElement('div')
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #003D79;
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 13px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      z-index: 99999;
      animation: slideIn 0.3s ease;
    `
    notif.innerHTML = '🔄 Menu diperbarui, memuat ulang...'
    document.body.appendChild(notif)

    // Style animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to   { transform: translateX(0);      opacity: 1; }
      }
    `
    document.head.appendChild(style)
  }

async function checkAuth() {
  // ── STEP 1: Load cache dulu (instant, tidak nunggu network) ──
  const cachedUser      = getUserCache()
  const cachedMenusData = getMenusCache()

  if (cachedUser) {
    setUser(cachedUser)
    setUserRoles(Array.isArray(cachedUser.roles) ? cachedUser.roles : [])
    setIsSuperAdmin(cachedUser.is_super_admin || false)
    setUserPermissions(cachedUser.permissions || [])
    if (cachedMenusData?.menus) setMenus(cachedMenusData.menus)
  }

    // ── ✨ AUTO-REFRESH: Cek perubahan roles di background ──
  if (cachedUser && navigator.onLine) {
    silentRoleCheck(cachedUser)
  }

  // Backward compat: cache menu lama
  const cachedMenu     = typeof window !== 'undefined' ? localStorage.getItem('btm_menus_v1') : null
  const cachedMenuTime = typeof window !== 'undefined' ? localStorage.getItem('btm_menus_time_v1') : null
  const isMenuOldValid = cachedMenuTime && (Date.now() - parseInt(cachedMenuTime)) < 3600000
  if (cachedMenu && isMenuOldValid && !cachedMenusData) {
    try { setMenus(JSON.parse(cachedMenu)) } catch {}
  }

  // ── STEP 2: Kalau offline → langsung pakai cache, tidak perlu fetch ──
  if (!navigator.onLine) {
    console.log('📴 Offline — menggunakan cache lokal')
    if (cachedUser && isCacheValid()) {
      setLoading(false)
      return
    }
    // Tidak ada cache sama sekali → terpaksa minta login
    router.push('/')
    return
  }

  // ── STEP 3: Online → coba fetch dengan cookie dulu ──
  try {
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 8000)

    const [authRes, menuRes] = await Promise.all([
      fetch('/api/auth/me', { signal: controller.signal }),
      fetch('/api/menus',   { signal: controller.signal })
    ])

    clearTimeout(timeoutId)

    // ── STEP 4: Kalau cookie gagal → coba token dari localStorage ──
    if (!authRes.ok) {
      const localToken = typeof window !== 'undefined'
        ? localStorage.getItem('btm_session_token_v1')
        : null

      if (localToken) {
        console.log('🔄 Cookie hilang, coba token dari localStorage...')
        try {
          const retryRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${localToken}` },
            signal: AbortSignal.timeout(5000)
          })

          if (retryRes.ok) {
            // Token localStorage masih valid → set ulang cookie via renew
            const retryData = await retryRes.json()
            console.log('✅ Token localStorage valid, lanjut masuk')

            // Panggil renew endpoint untuk set ulang cookie
            await fetch('/api/auth/renew', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localToken}`
              },
              signal: AbortSignal.timeout(5000)
            })

            // Set state dari data yang didapat
            setUser(retryData.user)
            const roles = Array.isArray(retryData.roles) ? retryData.roles : []
            setUserRoles(roles)
            setIsSuperAdmin(retryData.user?.is_super_admin || false)
            setUserPermissions(retryData.permissions || [])

            // Fetch menus ulang
            try {
              const menuRetry = await fetch('/api/menus', {
                headers: { 'Authorization': `Bearer ${localToken}` },
                signal: AbortSignal.timeout(5000)
              })
              if (menuRetry.ok) {
                const menuRetryData = await menuRetry.json()
                const menusArr = Array.isArray(menuRetryData)
                  ? menuRetryData
                  : (menuRetryData.menus || menuRetryData.data || [])
                const filtered = menusArr.filter((m: MenuItem) => {
                  if (m.active === false) return false
                  if (retryData.user?.is_super_admin) return true
                  if (m.role === '*') return true                   // ← BARU
                  return roles.includes(m.role)
                })
                setMenus(filtered)
                saveMenusCache({ menus: filtered })
              }
            } catch {}

            saveUserCache({ ...retryData.user, roles, permissions: retryData.permissions || [] })
            setLoading(false)
            return
          }
        } catch (retryErr) {
          console.warn('⚠️ Retry dengan localStorage token gagal:', retryErr)
        }
      }

      // Token localStorage juga gagal → cek cache offline
      if (cachedUser && isCacheValid()) {
        console.log('🔴 Session invalid, pakai cache offline')
        setLoading(false)
        return
      }

      // Tidak ada fallback → paksa login
      router.push('/')
      return
    }

    // ── STEP 5: Cookie valid → proses normal ──
    const [data, menuData] = await Promise.all([
      authRes.json(),
      menuRes.json()
    ])

    setUser(data.user)
    const roles: string[] = Array.isArray(data.roles) ? data.roles : []
    setUserRoles(roles)
    setIsSuperAdmin(data.user?.is_super_admin || false)
    setUserPermissions(data.permissions || [])

    const menusArray = Array.isArray(menuData)
      ? menuData
      : (menuData.menus || menuData.data || [])

    const filtered = menusArray.filter((m: MenuItem) => {
      if (m.active === false) return false
      if (data.user?.is_super_admin) return true
      if (m.role === '*') return true                 // ← BARU: wildcard match semua role
      return roles.includes(m.role)
    })

    setMenus(filtered)

    // Simpan cache lama (backward compat)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('btm_menus_v1', JSON.stringify(filtered))
        localStorage.setItem('btm_menus_time_v1', Date.now().toString())
      } catch {}
    }

    // Simpan cache baru
    saveUserCache({ ...data.user, roles, permissions: data.permissions || [] })
    saveMenusCache({ menus: filtered })

    // ✅ v2.0: Pastikan token di localStorage selalu fresh
    // (token sudah ada dari login, tapi kalau user login lama → tidak ada)
    // Kita tidak bisa ambil token dari /api/auth/me karena httpOnly
    // Token sudah tersimpan saat login, tidak perlu update di sini

  } catch (err: any) {
    console.error('Auth Error:', err)

    const isNetworkError = err.name === 'AbortError' ||
                           err.name === 'TypeError' ||
                           !navigator.onLine

    if (isNetworkError && cachedUser && isCacheValid()) {
      console.log('🔴 Network error, pakai cached session')
      setLoading(false)
      return
    }

    router.push('/')
  } finally {
    setLoading(false)
  }
}

  async function fetchNotif() {
    try {
      const res = await fetch('/api/notifikasi')
      if (res.ok) {
        const data = await res.json()
        setNotifCount(data.total_notifikasi || 0)
        setNotifData({
          approval: data.approval || { total: 0, breakdown: [] },
          expired: data.expired || { total: 0, critical: 0, breakdown: [] }
        })
      }
    } catch (err) { console.error("Notif Error:", err) }
  }

  async function handleLogout() {
    // ✨ Hapus semua cache offline
    try {
      const { clearAuthCache } = await import('@/app/lib/auth-cache')
      clearAuthCache()
      // Hapus cache menu lama juga
      if (typeof window !== 'undefined') {
        localStorage.removeItem('btm_menus_v1')
        localStorage.removeItem('btm_menus_time_v1')
      }
    } catch {}
    
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    router.push('/')
}

    function handleTabClick(tab: typeof TAB_CONFIG[0]) {
        // Handle tab Plant → tampilkan bottom sheet menu
    if (tab.key === 'plant') {
      const tabMenus = menus.filter(m => tab.customMatch(m))
      tabMenus.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      setBottomSheetMenus(tabMenus)
      setBottomSheetTitle('Plant')
      setActiveTab('plant')
      setBottomSheetOpen(true)
      return
    }

    const tabMenus = menus.filter(m => tab.customMatch(m))
    tabMenus.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    
    if (tab.key === 'profile' || tabMenus.length > 1) {
      setBottomSheetMenus(tabMenus)
      setBottomSheetTitle(tab.label)
      setActiveTab(tab.key)
      setBottomSheetOpen(true)
      return
    }
    
    if (tabMenus.length === 1) {
      router.push(`/dashboard?menu=${tabMenus[0].menu_key}`)
      setActiveTab(tab.key)
      return
    }

    // Tambahkan ini: Jika tab diklik tapi tidak ada isinya
    if (tabMenus.length === 0) {
      alert(`Menu ${tab.label} belum tersedia untuk akses Anda atau sedang dalam pemeliharaan.`)
    }
  }

  function navigateMenu(menuKey: string) {
    // Routing khusus untuk menu Plant
    if (menuKey === 'plant_katalog') {
      router.push('/parts-catalog')
      setBottomSheetOpen(false)
      return
    }
    if (menuKey === 'plant_orders') {
      router.push('/part-orders')
      setBottomSheetOpen(false)
      return
    }
    if (menuKey === 'plant_admin') {
      router.push('/partbook/admin')
      setBottomSheetOpen(false)
      return
    }

    // Routing menu Koreksi Absensi (STANDALONE pages)
    if (menuKey === 'koreksi_absensi') {
      router.push('/dashboard/koreksi-absensi')
      setBottomSheetOpen(false)
      return
    }
    if (menuKey === 'approval_koreksi') {
      router.push('/dashboard/approval-koreksi')
      setBottomSheetOpen(false)
      return
    }
    if (menuKey === 'manajemen_absensi') {
  router.push('/dashboard/manajemen-absensi')
  setBottomSheetOpen(false)
  return
}
if (menuKey === 'rekap_absensi') {
  router.push('/dashboard/rekap-absensi')
  setBottomSheetOpen(false)
  return
}
    if (menuKey === 'hr_override_absensi') {
      router.push('/dashboard/hr-override-absensi')
      setBottomSheetOpen(false)
      return
    }

    // ✨ MCU Advanced (Chat 18) ─────────────────
    if (menuKey === 'monitoring_mcu') {
      router.push('/dashboard/monitoring-mcu')
      setBottomSheetOpen(false)
      return
    }
    if (menuKey === 'mcu_saya') {
      router.push('/dashboard/mcu-saya')
      setBottomSheetOpen(false)
      return
    }
    // 🦺 APD Saya (Chat 22)
    if (menuKey === 'apd_saya') {
      router.push('/dashboard/apd-saya')
      setBottomSheetOpen(false)
      return
    }

    // 🦺 Kelola APD (Chat 22)
    if (menuKey === 'kelola_apd') {
      router.push('/dashboard/kelola-apd')
      setBottomSheetOpen(false)
      return
    }
        // Routing menu Kelola Akses (Batch 1 - Tab Karyawan)
    if (menuKey === 'kelola_akses') {
      router.push('/dashboard/kelola-akses')
      setBottomSheetOpen(false)
      return
    }

    // 📊 Monitoring APD (Chat 22)
    if (menuKey === 'monitoring_apd') {
      router.push('/dashboard/monitoring-apd')
      setBottomSheetOpen(false)
      return
    }

    // 📥 Import MCU Massal Auto-Fill (Chat 20) ─────────────────
    if (menuKey === 'import_mcu_bulk') {
      router.push('/dashboard/import-mcu')
      setBottomSheetOpen(false)
      return
    }

    // Default: menu dashboard biasa
    router.push(`/dashboard?menu=${menuKey}`)
    setBottomSheetOpen(false)
  }

  if (loading || !user) return <div className="min-h-screen bg-slate-100 flex items-center justify-center animate-pulse text-slate-500">Memuat...</div>

    const visibleTabs = TAB_CONFIG.filter(tab => {
    // Jika tab adalah system_config, HANYA tampil jika isSuperAdmin true
    if (tab.key === 'system_config') return isSuperAdmin;
    
    // Untuk tab lainnya, admin bypass atau cek role seperti biasa
    if (isSuperAdmin) return true;
    return tab.roles.some(r => userRoles.includes(r));
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative overflow-hidden">
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{ backgroundImage: `url('/bg-pattern.png')`, backgroundRepeat: 'repeat', backgroundSize: '150px' }}
      />

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#003D79] text-white fixed top-0 left-0 bottom-0 z-40 overflow-y-auto">
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg shrink-0">
              <Image src="/btm-fix.png" alt="BTM" width={32} height={32} className="object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs truncate">BTM Portal</div>
              <div className="text-[10px] text-blue-200 font-black uppercase truncate leading-tight">{user.nama}</div>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setIsNotifOpen(true)} 
            className="relative w-9 h-9 flex items-center justify-center active:scale-90 transition-all cursor-pointer bg-white/10 hover:bg-white/20 rounded-xl shrink-0"
          >
            <span className="text-lg">🔔</span>
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black h-4 w-4 flex items-center justify-center rounded-full border-2 border-[#003D79] shadow-lg animate-bounce">
                {notifCount}
              </span>
            )}
          </button>
        </div>

        <div className="p-4 space-y-1">
          {visibleTabs.map(tab => (
            <div key={tab.key}>
              <button onClick={() => handleTabClick(tab)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 transition-all ${activeTab === tab.key ? 'bg-white/10 border-l-4 border-white text-white font-bold' : 'text-slate-400 hover:bg-white/5'}`}>
                <span className="text-lg">{tab.icon}</span><span>{tab.label}</span>
              </button>
              {activeTab === tab.key && menus.filter(m => tab.customMatch(m)).length > 1 && (
                <div className="ml-9 mt-1 space-y-1 border-l border-white/10">
                  {menus.filter(m => tab.customMatch(m)).map(m => (
                    <button key={m.menu_key} onClick={() => navigateMenu(m.menu_key)} className={`w-full text-left px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors ${activeMenu === m.menu_key ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                      <span>{m.menu_icon || '•'}</span><span>{m.menu_label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
  
          <button onClick={handleLogout} className="w-full mt-6 bg-red-600/20 text-red-400 py-2.5 rounded-xl text-xs font-bold hover:bg-red-600/30 transition-colors">🚪 Keluar</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 min-w-0 lg:ml-64 pb-24 lg:pb-6">
        <SyncIndicator />  {/* ← BARU! Badge sync indicator */}
        <ClockOutReminder />
        <VerificationModal />

        {/* HEADER MOBILE */}
                       <div className="lg:hidden bg-white/70 backdrop-blur-xl border-b border-white/40 px-3 py-1.5 flex items-center justify-between fixed top-0 left-0 right-0 z-[60] shadow-[0_4px_20px_rgba(0,61,121,0.05)]">
          {/* Kiri: Logo + Nama App + Versi (Kompak) */}
          <div className="flex items-center gap-2 shrink-0">
            <Image src="/btm-fix.png" alt="BTM" width={18} height={18} />
            <div className="leading-[1.1]">
              <h1 className="text-[10px] font-black uppercase text-[#003D79] tracking-tight">BTM Mobile</h1>
              <p className="text-[7px] font-bold text-slate-400">v1.6.2</p>
            </div>
          </div>

          {/* Kanan: Info Karyawan + Lonceng (Baris Rapat) */}
          <div className="flex items-center gap-2">
            <div className="text-right leading-[1.1] shrink-0 max-w-[140px]">
              <div className="text-[9px] font-black text-[#003D79] uppercase truncate">{user.nama}</div>
              <div className="text-[7px] text-slate-500 font-bold">NRP: {user.nrp_login || user.nrp}</div>
              <div className="text-[7px] text-blue-600 font-black">{user.site || '-'}</div>
            </div>
            <button 
              type="button"
              onClick={() => setIsNotifOpen(true)} 
              className="relative flex items-center justify-center active:scale-90 transition-all cursor-pointer z-[70] shrink-0"
            >
              <span className="text-2xl">🔔</span>
              {notifCount > 0 && (
                <>
                  <span className="absolute -top-0.5 -right-0.5 animate-ping h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                  <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[7px] font-black h-3.5 w-3.5 flex items-center justify-center rounded-full border border-white shadow-lg pointer-events-none">
                    {notifCount}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

                <div className="p-4 lg:p-6 pt-16 lg:pt-6">
  <AuthProvider user={{ ...user, is_super_admin: isSuperAdmin }} permissions={userPermissions}>
    {children}
  </AuthProvider>
</div>
      </main>

      {/* BOTTOM NAVIGATION MOBILE */}
            <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-50 bg-white/70 backdrop-blur-2xl border border-white/50 flex overflow-x-auto px-2 py-2 rounded-[1.8rem] shadow-[0_10px_40px_rgba(0,61,121,0.15)] no-scrollbar">
        {visibleTabs.map(tab => (
          <button 
            key={tab.key} 
            onClick={() => handleTabClick(tab)} 
            className={`flex flex-col items-center min-w-[55px] flex-1 py-1 transition-all duration-300 ${activeTab === tab.key ? 'text-[#003D79] scale-110' : 'text-slate-400 opacity-60'}`}
          >
            <div className={`text-base mb-0.5 ${activeTab === tab.key ? '' : 'grayscale'}`}>{tab.icon}</div>
            <span className={`text-[8px] tracking-tighter font-black uppercase ${activeTab === tab.key ? 'opacity-100' : 'opacity-70'}`}>{tab.label}</span>
            {activeTab === tab.key && <div className="w-1 h-1 bg-[#003D79] rounded-full mt-0.5 animate-pulse"></div>}
          </button>
        ))}
      </nav>

      {/* BOTTOM SHEET MENU */}
      {bottomSheetOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden" onClick={() => setBottomSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[101] lg:hidden bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
            <h3 className="font-black text-lg mb-6 px-2 text-slate-800 tracking-tight uppercase text-center">{bottomSheetTitle}</h3>
            <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto">
              {bottomSheetMenus.map(m => (
                <button key={m.menu_key} onClick={() => navigateMenu(m.menu_key)} className={`w-full text-left p-5 rounded-3xl flex items-center justify-between border transition-all active:scale-95 ${activeMenu === m.menu_key ? 'bg-blue-50 border-blue-200 text-[#003D79]' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{m.menu_icon || '📄'}</span>
                    <span className="text-sm font-bold uppercase tracking-tight">{m.menu_label}</span>
                  </div>
                  {activeMenu === m.menu_key && <span className="text-blue-600">✓</span>}
                </button>
              ))}
              {activeTab === 'profile' && (
                <button onClick={handleLogout} className="w-full text-left p-5 rounded-3xl flex items-center gap-4 text-red-600 bg-red-50 font-black mt-4 uppercase text-sm border border-red-100 active:scale-95 transition-all">
                  <span className="text-2xl">🚪</span><span>Keluar Aplikasi</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL NOTIFICATION */}
      {isNotifOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999]" onClick={() => setIsNotifOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[1000] overflow-hidden">
            <div className="p-8 bg-[#003D79] text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-xl tracking-tight uppercase">Pusat Notifikasi</h3>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em]">Update Real-time</p>
              </div>
              <button onClick={() => setIsNotifOpen(false)} className="bg-white/10 hover:bg-white/20 h-10 w-10 flex items-center justify-center rounded-full transition-colors">✕</button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto bg-slate-50/50 space-y-4">
              {notifCount === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4 opacity-20">🏝️</div>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Semua Aman!</p>
                  <p className="text-slate-300 text-[10px] font-bold mt-2">Tidak ada notifikasi menunggu</p>
                </div>
              ) : (
                <div className="space-y-4">

                  {/* ═══════ KATEGORI 1: APPROVAL ═══════ */}
                  {notifData.approval.total > 0 && (
                    <div className="bg-white border-2 border-blue-100 rounded-[2rem] overflow-hidden shadow-sm">
                      <div className="bg-blue-50 px-5 py-3 flex items-center justify-between border-b border-blue-100">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📝</span>
                          <span className="font-black text-[#003D79] text-xs uppercase tracking-widest">Persetujuan</span>
                        </div>
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                          {notifData.approval.total}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {notifData.approval.breakdown.map((item: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              setIsNotifOpen(false)
                              router.push(`/dashboard?menu=approval_center`)
                            }}
                            className="w-full px-5 py-3 flex items-center gap-3 hover:bg-blue-50/50 transition-all active:scale-95 text-left"
                          >
                            <div className="text-xl">{item.icon}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-slate-900 text-xs">
                                {item.count} {item.jenis.replace(/_/g, ' ')}
                              </p>
                              <p className="text-[10px] text-slate-500 font-bold">
                                dari {item.site} • Tahap {item.tahap}
                              </p>
                            </div>
                            <span className="text-slate-300 text-lg">›</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ═══════ KATEGORI 2: DOKUMEN EXPIRED ═══════ */}
                  {notifData.expired.total > 0 && (
                    <div className={`bg-white border-2 rounded-[2rem] overflow-hidden shadow-sm ${
                      notifData.expired.critical > 0 ? 'border-rose-200' : 'border-amber-100'
                    }`}>
                      <div className={`px-5 py-3 flex items-center justify-between border-b ${
                        notifData.expired.critical > 0 ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{notifData.expired.critical > 0 ? '🚨' : '⚠️'}</span>
                          <span className={`font-black text-xs uppercase tracking-widest ${
                            notifData.expired.critical > 0 ? 'text-rose-700' : 'text-amber-700'
                          }`}>
                            Dokumen Expired
                          </span>
                          {notifData.expired.critical > 0 && (
                            <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">
                              🔥 {notifData.expired.critical} Kritis
                            </span>
                          )}
                        </div>
                        <span className={`text-white text-[10px] font-black px-2.5 py-1 rounded-full ${
                          notifData.expired.critical > 0 ? 'bg-rose-500' : 'bg-amber-500'
                        }`}>
                          {notifData.expired.total}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {notifData.expired.breakdown.map((item: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              setIsNotifOpen(false)
                              router.push(`/dashboard?menu=monitoring_expired`)
                            }}
                            className="w-full px-5 py-3 flex items-center gap-3 hover:bg-amber-50/50 transition-all active:scale-95 text-left"
                          >
                            <div className="text-xl">{item.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-black text-slate-900 text-xs">
                                  {item.count} {item.jenis}
                                </p>
                                {item.critical > 0 && (
                                  <span className="bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">
                                    🔥 {item.critical}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-bold">
                                Site: {item.site}
                              </p>
                            </div>
                            <span className="text-slate-300 text-lg">›</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
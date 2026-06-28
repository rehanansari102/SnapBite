'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { logout } from '@/app/actions/auth'
import ThemeToggle from '@/components/ThemeToggle'

const OwnerNotificationBell = dynamic(
  () => import('@/components/layout/OwnerNotificationBell'),
  { ssr: false }
)

interface Props {
  email: string
  role: string
  restaurantIds: string[]
  adminPendingCount: number
  children: React.ReactNode
}

type NavItem = { label: string; href: string; exact?: boolean; icon: React.ReactNode }

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  )},
  { label: 'Restaurants', href: '/restaurants', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
  )},
  { label: 'My Orders', href: '/orders', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
  )},
  { label: 'Cart', href: '/cart', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
  )},
]

const OWNER_NAV_ITEMS: NavItem[] = [
  { label: 'My Restaurants', href: '/dashboard/restaurants', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
  )},
  { label: 'Incoming Orders', href: '/dashboard/orders', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
  )},
  { label: 'Earnings', href: '/dashboard/earnings', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  )},
]

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Admin Panel', href: '/dashboard/admin', exact: true, icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
  )},
  { label: 'Users', href: '/dashboard/admin/users', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  )},
  { label: 'Analytics', href: '/dashboard/admin/analytics', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
  )},
  { label: 'Promos', href: '/dashboard/admin/promos', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
  )},
]

function initials(email: string) {
  return email ? email[0].toUpperCase() : '?'
}

function roleLabel(role: string) {
  if (role === 'restaurant_owner') return 'Restaurant Owner'
  if (role === 'admin') return 'Admin'
  return 'Customer'
}

function NavLink({ href, icon, label, badge, exact, onClick }: { href: string; icon: React.ReactNode; label: string; badge?: number; exact?: boolean; onClick?: () => void }) {
  const pathname = usePathname()
  const active = pathname === href || (!exact && href !== '/dashboard' && pathname.startsWith(href + '/'))

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-200/60'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80 dark:hover:text-gray-100 dark:hover:bg-white/10'
      }`}
    >
      <span className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'}`}>
        {icon}
      </span>
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : active ? (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
      ) : null}
    </Link>
  )
}

export default function AppShell({ email, role, restaurantIds, adminPendingCount, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const profileRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const isOwner = role === 'restaurant_owner' || role === 'admin'
  const isAdmin = role === 'admin'
  const allNav = [...NAV_ITEMS, ...(isOwner ? OWNER_NAV_ITEMS : []), ...(isAdmin ? ADMIN_NAV_ITEMS : [])]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleLogout() {
    startTransition(async () => { await logout() })
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100/80 dark:border-gray-700/60 ${mobile ? 'w-72 h-full' : 'w-64 hidden lg:flex sticky top-0 h-screen'}`}>
      {/* Logo */}
      <div className="flex items-center gap-1 px-5 py-5 border-b border-gray-100/80 dark:border-gray-700/60">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200/60 flex-shrink-0">
          <span className="text-2xl animate-float inline-block">🍔</span>
        </div>
        <div>
          <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">SnapBite</span>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none mt-0.5">{roleLabel(role)}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-3 mb-2">Menu</p>
        {allNav.map(({ label, href, icon, exact }) => (
          <NavLink
            key={href}
            href={href}
            icon={icon}
            label={label}
            exact={exact}
            badge={href === '/dashboard/admin' ? adminPendingCount : undefined}
            onClick={() => setSidebarOpen(false)}
          />
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-gray-100/80 dark:border-gray-700/60 space-y-1">
        <Link href="/dashboard/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials(email)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-300 truncate">{email}</p>
          </div>
        </Link>
        <button onClick={handleLogout} disabled={isPending}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50/80 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          <span className="font-medium">{isPending ? 'Logging out…' : 'Log out'}</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen flex app-bg">
      <SidebarContent />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex animate-fade-in">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 animate-slide-in-left shadow-2xl">
            <SidebarContent mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100/80 dark:border-gray-700/60 px-4 sm:px-6 h-14 flex items-center gap-3">
          <button className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => setSidebarOpen(true)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <div className="lg:hidden flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <span className="text-xl animate-float inline-block">🍔</span>
            </div>
            <span className="font-black text-gray-900 dark:text-white">SnapBite</span>
          </div>

          <form
            className="flex-1 max-w-sm mx-2 hidden sm:flex"
            onSubmit={e => {
              e.preventDefault()
              const q = searchQuery.trim()
              if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
            }}
          >
            <div className="relative w-full">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search restaurants…"
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-100/80 dark:bg-white/10 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 dark:text-white placeholder-gray-400 transition-all"
              />
            </div>
          </form>

          <div className="flex-1" />

          <ThemeToggle />

          {restaurantIds.length > 0 && (
            <OwnerNotificationBell restaurantIds={restaurantIds} />
          )}

          {/* Cart quick link */}
          <Link href="/cart" className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </Link>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button onClick={() => setProfileOpen(v => !v)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {initials(email)}
              </div>
              <span className="hidden sm:block text-sm font-semibold text-gray-700 dark:text-gray-300">{email.split('@')[0]}</span>
              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl shadow-gray-200/60 dark:shadow-black/40 overflow-hidden animate-fade-up z-50">
                <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-400">
                  <p className="text-xs font-bold text-white truncate">{email}</p>
                  <p className="text-[11px] text-orange-100 mt-0.5">{roleLabel(role)}</p>
                </div>
                {[
                  { href: '/dashboard/profile', label: 'My Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                  { href: '/dashboard/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                ].map(({ href, label, icon }) => (
                  <Link key={href} href={href} onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
                    </svg>
                    {label}
                  </Link>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-700 mx-3" />
                <button onClick={handleLogout} disabled={isPending}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  {isPending ? 'Logging out…' : 'Log out'}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-7 animate-fade-up">
          {children}
        </main>

        <footer className="border-t border-gray-100/80 dark:border-gray-700/60 px-6 py-4 text-center">
          <p className="text-xs text-gray-400">© 2026 SnapBite · Made with ❤️ for food lovers</p>
        </footer>
      </div>
    </div>
  )
}

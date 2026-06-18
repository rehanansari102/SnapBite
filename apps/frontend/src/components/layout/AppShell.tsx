'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'

interface Props {
  email: string
  role: string
  children: React.ReactNode
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: '⚡' },
  { label: 'Restaurants', href: '/restaurants', icon: '🍔' },
  { label: 'Orders', href: '/orders', icon: '🛍️' },
]

const OWNER_NAV_ITEMS = [
  { label: 'My Restaurants', href: '/dashboard/restaurants', icon: '🏪' },
  { label: 'Incoming Orders', href: '/dashboard/orders', icon: '📋' },
]

function initials(email: string) {
  return email ? email[0].toUpperCase() : '?'
}

function roleLabel(role: string) {
  if (role === 'restaurant_owner') return 'Restaurant Owner'
  if (role === 'admin') return 'Admin'
  return 'Customer'
}

export default function AppShell({ email, role, children }: Props) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const profileRef = useRef<HTMLDivElement>(null)

  const isOwner = role === 'restaurant_owner' || role === 'admin'
  const allNav = [...NAV_ITEMS, ...(isOwner ? OWNER_NAV_ITEMS : [])]

  // Close profile dropdown on outside click
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
    startTransition(async () => {
      await logout()
    })
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={`
        flex flex-col bg-white border-r border-gray-100
        ${mobile ? 'w-72 h-full' : 'w-64 hidden lg:flex sticky top-0 h-screen overflow-y-auto'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100">
        <span className="text-2xl animate-float inline-block">🍔</span>
        <span className="text-xl font-extrabold text-orange-500 tracking-tight">SnapBite</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allNav.map(({ label, href, icon }, i) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`
                animate-fade-up flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${active
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                  : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }
              `}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout at bottom */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          <span className="text-base">🚪</span>
          {isPending ? 'Logging out…' : 'Log out'}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex animate-fade-in">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 animate-slide-in-left">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <span className="text-xl animate-float inline-block">🍔</span>
            <span className="text-lg font-extrabold text-orange-500">SnapBite</span>
          </div>

          <div className="flex-1" />

          {/* Profile dropdown — top right */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-orange-100">
                {initials(email)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-gray-800 leading-none">{email}</p>
                <p className="text-xs text-gray-400 mt-0.5">{roleLabel(role)}</p>
              </div>
              <span className={`text-gray-400 text-xs transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden animate-fade-up z-50">
                {/* Profile header */}
                <div className="px-4 py-3 border-b border-gray-50 bg-orange-50">
                  <p className="text-xs font-semibold text-orange-600 truncate">{email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{roleLabel(role)}</p>
                </div>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                >
                  <span>👤</span> My Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                >
                  <span>⚙️</span> Settings
                </Link>
                <div className="border-t border-gray-100" />
                <button
                  onClick={handleLogout}
                  disabled={isPending}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                >
                  <span>🚪</span>
                  {isPending ? 'Logging out…' : 'Log out'}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 animate-fade-up">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-100 px-6 py-4 text-center">
          <p className="text-xs text-gray-400">© 2026 SnapBite — All rights reserved</p>
        </footer>
      </div>
    </div>
  )
}

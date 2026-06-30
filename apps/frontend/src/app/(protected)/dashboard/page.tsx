import { cookies } from 'next/headers'
import Link from 'next/link'
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner'
import { apiGetPendingRestaurants, apiGetOwnerApplications } from '@/app/lib/api'

export const metadata = { title: 'Dashboard — SnapBite' }

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
  } catch { return {} }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const token = (await cookies()).get('access_token')?.value ?? ''
  const payload = decodeJwtPayload(token)
  const isEmailVerified = payload.isEmailVerified === true
  const isOwner = payload.role === 'restaurant_owner'
  const isAdmin = payload.role === 'admin'
  const isCustomer = payload.role === 'customer'
  const isDriver = payload.role === 'driver'
  const name = String(payload.email ?? '').split('@')[0]

  let adminPendingCount = 0
  if (isAdmin) {
    try {
      const [pendingRestaurants, ownerApplications] = await Promise.all([
        apiGetPendingRestaurants(token),
        apiGetOwnerApplications(token),
      ])
      adminPendingCount = pendingRestaurants.length + ownerApplications.length
    } catch { /* non-fatal */ }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {!isEmailVerified && <EmailVerificationBanner />}

      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-3xl p-8 text-white" style={{ background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f97316 100%)' }}>
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-orange-200 text-sm font-semibold uppercase tracking-widest mb-1">{getGreeting()}</p>
            <h1 className="text-3xl font-black tracking-tight capitalize">{name} 👋</h1>
            <p className="text-orange-100 mt-2 text-sm">
              {isAdmin ? 'Platform overview & controls' : isDriver ? 'Ready to deliver?' : 'What are you hungry for today?'}
            </p>
          </div>
          {!isAdmin && !isDriver && (
            <Link href="/restaurants"
              className="flex-shrink-0 flex items-center gap-2 bg-white text-orange-600 font-bold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 text-sm">
              <span>🍔</span> Order now
            </Link>
          )}
        </div>
      </div>

      {/* Stats row — customer only */}
      {!isAdmin && !isDriver && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Orders', value: '—', icon: '🛍️', href: '/orders', color: 'from-blue-50 to-blue-100/50', iconBg: 'bg-blue-100', text: 'text-blue-600' },
            { label: 'Saved Places', value: '—', icon: '❤️', href: '#', color: 'from-pink-50 to-pink-100/50', iconBg: 'bg-pink-100', text: 'text-pink-600' },
            { label: 'Loyalty Points', value: '0', icon: '⭐', href: '#', color: 'from-amber-50 to-amber-100/50', iconBg: 'bg-amber-100', text: 'text-amber-600' },
          ].map(card => (
            <Link key={card.label} href={card.href}
              className={`relative overflow-hidden bg-gradient-to-br ${card.color} rounded-2xl p-5 border border-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group`}>
              <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center text-xl mb-3`}>
                {card.icon}
              </div>
              <p className="text-2xl font-black text-gray-900">{card.value}</p>
              <p className={`text-xs font-semibold ${card.text} mt-0.5`}>{card.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Browse CTA — always visible */}
          <Link href="/restaurants"
            className="group relative overflow-hidden rounded-2xl p-6 flex items-center gap-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 70% 50%, #fff, transparent)' }} />
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300">🍔</div>
            <div className="text-white">
              <p className="font-black text-lg leading-tight">Browse Restaurants</p>
              <p className="text-orange-100 text-sm mt-0.5">Find food near you</p>
            </div>
            <svg className="w-5 h-5 text-white/60 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
            </svg>
          </Link>

          {/* Orders */}
          <Link href="/orders"
            className="group relative overflow-hidden rounded-2xl p-6 flex items-center gap-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 70% 50%, #3b82f6, transparent)' }} />
            <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-200">🛍️</div>
            <div>
              <p className="font-black text-lg text-gray-900 leading-tight">My Orders</p>
              <p className="text-blue-400 text-sm mt-0.5">Track & reorder</p>
            </div>
            <svg className="w-5 h-5 text-blue-300 ml-auto flex-shrink-0 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
            </svg>
          </Link>

          {/* Owner cards */}
          {isOwner && (
            <Link href="/dashboard/restaurants"
              className="group relative overflow-hidden rounded-2xl p-6 flex items-center gap-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 70% 50%, #f97316, transparent)' }} />
              <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-200">🏪</div>
              <div>
                <p className="font-black text-lg text-gray-900 leading-tight">My Restaurants</p>
                <p className="text-orange-400 text-sm mt-0.5">Manage menus & hours</p>
              </div>
              <svg className="w-5 h-5 text-orange-300 ml-auto flex-shrink-0 group-hover:text-orange-500 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          )}

          {isDriver && (
            <Link href="/dashboard/driver/available"
              className="group relative overflow-hidden rounded-2xl p-6 flex items-center gap-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 70% 50%, #3b82f6, transparent)' }} />
              <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-200">🛵</div>
              <div>
                <p className="font-black text-lg text-gray-900 leading-tight">Available Pickups</p>
                <p className="text-blue-400 text-sm mt-0.5">Find orders to deliver</p>
              </div>
              <svg className="w-5 h-5 text-blue-300 ml-auto flex-shrink-0 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          )}

          {isDriver && (
            <Link href="/dashboard/driver/active"
              className="group relative overflow-hidden rounded-2xl p-6 flex items-center gap-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 70% 50%, #f97316, transparent)' }} />
              <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-200">📍</div>
              <div>
                <p className="font-black text-lg text-gray-900 leading-tight">Active Delivery</p>
                <p className="text-orange-400 text-sm mt-0.5">Track your current order</p>
              </div>
              <svg className="w-5 h-5 text-orange-300 ml-auto flex-shrink-0 group-hover:text-orange-500 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          )}

          {isDriver && (
            <Link href="/dashboard/driver/history"
              className="group relative overflow-hidden rounded-2xl p-6 flex items-center gap-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 70% 50%, #22c55e, transparent)' }} />
              <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-green-200">📋</div>
              <div>
                <p className="font-black text-lg text-gray-900 leading-tight">Delivery History</p>
                <p className="text-green-400 text-sm mt-0.5">View past deliveries</p>
              </div>
              <svg className="w-5 h-5 text-green-300 ml-auto flex-shrink-0 group-hover:text-green-500 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          )}

          {isCustomer && (
            <Link href="/dashboard/apply-owner"
              className="group relative overflow-hidden rounded-2xl p-6 flex items-center gap-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 70% 50%, #7c3aed, transparent)' }} />
              <div className="w-14 h-14 rounded-2xl bg-violet-500 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-violet-200">🏪</div>
              <div>
                <p className="font-black text-lg text-gray-900 leading-tight">Become a Restaurant Owner</p>
                <p className="text-violet-400 text-sm mt-0.5">Apply to list your restaurant</p>
              </div>
              <svg className="w-5 h-5 text-violet-300 ml-auto flex-shrink-0 group-hover:text-violet-500 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          )}

          {isAdmin && (
            <Link href="/dashboard/admin/analytics"
              className="group relative overflow-hidden rounded-2xl p-6 flex items-center gap-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 70% 50%, #7c3aed, transparent)' }} />
              <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-violet-200">📊</div>
              <div>
                <p className="font-black text-lg text-gray-900 leading-tight">Analytics</p>
                <p className="text-violet-400 text-sm mt-0.5">Revenue, fees & top restaurants</p>
              </div>
              <svg className="w-5 h-5 text-violet-300 ml-auto flex-shrink-0 group-hover:text-violet-500 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          )}

          {isAdmin && (
            <Link href="/dashboard/admin"
              className="group relative overflow-hidden rounded-2xl p-6 flex items-center gap-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #faf5ff, #ede9fe)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 70% 50%, #8b5cf6, transparent)' }} />
              <div className="relative w-14 h-14 rounded-2xl bg-violet-500 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-violet-200">
                🛡️
                {adminPendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                    {adminPendingCount > 99 ? '99+' : adminPendingCount}
                  </span>
                )}
              </div>
              <div>
                <p className="font-black text-lg text-gray-900 leading-tight">Admin Panel</p>
                <p className="text-violet-400 text-sm mt-0.5">
                  {adminPendingCount > 0 ? `${adminPendingCount} item${adminPendingCount !== 1 ? 's' : ''} need attention` : 'Approve restaurants & owners'}
                </p>
              </div>
              <svg className="w-5 h-5 text-violet-300 ml-auto flex-shrink-0 group-hover:text-violet-500 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          )}

          {isOwner && (
            <Link href="/dashboard/orders"
              className="group relative overflow-hidden rounded-2xl p-6 flex items-center gap-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 70% 50%, #22c55e, transparent)' }} />
              <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-green-200">📋</div>
              <div>
                <p className="font-black text-lg text-gray-900 leading-tight">Incoming Orders</p>
                <p className="text-green-400 text-sm mt-0.5">Review & update status</p>
              </div>
              <svg className="w-5 h-5 text-green-300 ml-auto flex-shrink-0 group-hover:text-green-500 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

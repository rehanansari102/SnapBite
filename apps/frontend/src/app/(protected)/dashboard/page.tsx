import { cookies } from 'next/headers'
import Link from 'next/link'
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner'

export const metadata = { title: 'Dashboard — SnapBite' }

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
  } catch {
    return {}
  }
}

export default async function DashboardPage() {
  const token = (await cookies()).get('access_token')?.value ?? ''
  const payload = decodeJwtPayload(token)
  const isEmailVerified = payload.isEmailVerified === true
  const isOwner = payload.role === 'restaurant_owner' || payload.role === 'admin'

  return (
    <div>
      {!isEmailVerified && <EmailVerificationBanner />}

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-8">Welcome back, {String(payload.email ?? 'there')}!</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'My Orders', value: '0', icon: '🛍️', href: '/orders' },
          { label: 'Saved Addresses', value: '0', icon: '📍', href: '#' },
          { label: 'Loyalty Points', value: '0', icon: '⭐', href: '#' },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:border-orange-200 hover:shadow-md transition-all duration-200"
          >
            <p className="text-2xl mb-2">{card.icon}</p>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/restaurants"
          className="flex items-center gap-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl p-5 transition-all duration-200 shadow-lg shadow-orange-200"
        >
          <span className="text-3xl">🍔</span>
          <div>
            <p className="font-bold text-lg">Browse Restaurants</p>
            <p className="text-orange-100 text-sm">Find food near you</p>
          </div>
          <span className="ml-auto text-2xl opacity-60">→</span>
        </Link>

        {isOwner && (
          <Link
            href="/dashboard/restaurants"
            className="flex items-center gap-4 bg-white hover:border-orange-200 hover:shadow-md border border-gray-200 rounded-2xl p-5 transition-all duration-200"
          >
            <span className="text-3xl">🏪</span>
            <div>
              <p className="font-bold text-lg text-gray-900">My Restaurants</p>
              <p className="text-gray-400 text-sm">Manage menus & hours</p>
            </div>
            <span className="ml-auto text-2xl text-gray-300">→</span>
          </Link>
        )}
        {isOwner && (
          <Link
            href="/dashboard/orders"
            className="flex items-center gap-4 bg-white hover:border-orange-200 hover:shadow-md border border-gray-200 rounded-2xl p-5 transition-all duration-200"
          >
            <span className="text-3xl">📋</span>
            <div>
              <p className="font-bold text-lg text-gray-900">Incoming Orders</p>
              <p className="text-gray-400 text-sm">Review & update order status</p>
            </div>
            <span className="ml-auto text-2xl text-gray-300">→</span>
          </Link>
        )}
      </div>
    </div>
  )
}

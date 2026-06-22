import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { apiGetMyRestaurants } from '@/app/lib/api'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get('access_token')?.value
  if (!token) redirect('/login')

  // Decode JWT for user info — the proxy already verified it
  let email = ''
  let role = ''
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
    email = String(payload.email ?? '')
    role = String(payload.role ?? '')
  } catch { /* ignore */ }

  // Fetch restaurant IDs for owners so the notification bell can connect to the right rooms
  let restaurantIds: string[] = []
  if (role === 'restaurant_owner' || role === 'admin') {
    try {
      const restaurants = await apiGetMyRestaurants(token)
      restaurantIds = restaurants.map(r => r._id)
    } catch { /* non-fatal */ }
  }

  return <AppShell email={email} role={role} restaurantIds={restaurantIds}>{children}</AppShell>
}

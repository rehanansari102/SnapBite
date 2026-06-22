import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiGetMyRestaurants } from '@/app/lib/api'
import EarningsClient from './EarningsClient'

export const metadata = { title: 'Earnings — SnapBite' }

function decodeRole(token: string): string {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
    return String(payload.role ?? '')
  } catch {
    return ''
  }
}

export default async function EarningsPage() {
  const token = (await cookies()).get('access_token')?.value ?? ''
  const role = decodeRole(token)

  if (role !== 'restaurant_owner' && role !== 'admin') redirect('/dashboard')

  let restaurants: Awaited<ReturnType<typeof apiGetMyRestaurants>> = []
  try {
    restaurants = await apiGetMyRestaurants(token)
  } catch { /* handled in client */ }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Earnings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Revenue breakdown and analytics for your restaurants</p>
      </div>
      <EarningsClient restaurants={restaurants} />
    </div>
  )
}

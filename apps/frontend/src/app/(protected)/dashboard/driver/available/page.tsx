import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAvailableOrders, getDriverAvailability } from '@/app/actions/driver'
import AvailableOrdersClient from './AvailableOrdersClient'

export const metadata = { title: 'Available Pickups — SnapBite Driver' }

export default async function AvailableOrdersPage() {
  const token = (await cookies()).get('access_token')?.value
  if (!token) redirect('/login')

  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
  if (payload.role !== 'driver') redirect('/dashboard')

  const [orders, availability] = await Promise.all([
    getAvailableOrders().catch(() => []),
    getDriverAvailability().catch(() => ({ isAvailable: false })),
  ])

  return <AvailableOrdersClient initialOrders={orders} initialAvailable={availability.isAvailable} />
}

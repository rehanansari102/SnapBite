import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDriverHistory } from '@/app/actions/driver'
import DeliveryHistoryClient from './DeliveryHistoryClient'

export const metadata = { title: 'Delivery History — SnapBite Driver' }

export default async function DeliveryHistoryPage() {
  const token = (await cookies()).get('access_token')?.value
  if (!token) redirect('/login')

  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
  if (payload.role !== 'driver') redirect('/dashboard')

  const deliveries = await getDriverHistory().catch(() => [])

  return <DeliveryHistoryClient deliveries={deliveries} />
}

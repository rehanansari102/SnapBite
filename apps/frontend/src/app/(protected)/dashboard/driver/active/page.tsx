import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getActiveDelivery } from '@/app/actions/driver'
import ActiveDeliveryClient from './ActiveDeliveryClient'

export const metadata = { title: 'Active Delivery — SnapBite Driver' }

export default async function ActiveDeliveryPage() {
  const token = (await cookies()).get('access_token')?.value
  if (!token) redirect('/login')

  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
  if (payload.role !== 'driver') redirect('/dashboard')

  const order = await getActiveDelivery().catch(() => null)

  return <ActiveDeliveryClient order={order} />
}

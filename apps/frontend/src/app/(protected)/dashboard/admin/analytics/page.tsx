import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAdminAnalytics } from '@/app/actions/order'
import AnalyticsClient from './AnalyticsClient'

export const metadata = { title: 'Platform Analytics — SnapBite Admin' }

export default async function AdminAnalyticsPage() {
  const token = (await cookies()).get('access_token')?.value ?? ''
  let role = ''
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'))
    role = String(payload.role ?? '')
  } catch { /* ignore */ }

  if (role !== 'admin') redirect('/dashboard')

  let data = null
  try { data = await getAdminAnalytics() } catch { /* ignore */ }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Platform Analytics</h1>
        <p className="text-sm text-gray-400 mt-1">Revenue, orders, and commissions across all restaurants</p>
      </div>
      <AnalyticsClient data={data} />
    </div>
  )
}

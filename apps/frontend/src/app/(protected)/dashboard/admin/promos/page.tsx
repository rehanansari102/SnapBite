import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPromos } from '@/app/actions/order'
import PromosClient from './PromosClient'

export const metadata = { title: 'Promo Codes — SnapBite Admin' }

export default async function AdminPromosPage() {
  const token = (await cookies()).get('access_token')?.value ?? ''
  let role = ''
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'))
    role = String(payload.role ?? '')
  } catch { /* ignore */ }

  if (role !== 'admin') redirect('/dashboard')

  let promos = null
  try { promos = await getPromos() } catch { /* ignore */ }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Promo Codes</h1>
        <p className="text-sm text-gray-400 mt-1">Create and manage discount codes for customers</p>
      </div>
      <PromosClient initialPromos={promos ?? []} />
    </div>
  )
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getOrder } from '@/app/actions/order'
import OrderDetailClient from './OrderDetailClient'

export const metadata = { title: 'Order Details — SnapBite' }

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let order
  try {
    order = await getOrder(id)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/orders" className="text-sm text-gray-500 hover:text-orange-500 transition-colors">
          ← My Orders
        </Link>
      </div>
      <OrderDetailClient order={order} />
    </div>
  )
}

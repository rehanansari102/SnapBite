import Link from 'next/link'
import { getMyOrders } from '@/app/actions/order'
import type { OrderStatus } from '@/app/lib/api'

export const metadata = { title: 'My Orders — SnapBite' }

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready for pickup',
  PICKED_UP: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-blue-100 text-blue-700',
  READY: 'bg-purple-100 text-purple-700',
  PICKED_UP: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default async function OrdersPage() {
  const orders = await getMyOrders()

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-16 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-4xl">🛍️</div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">No orders yet</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-xs">Browse restaurants and place your first order.</p>
          </div>
          <Link href="/restaurants"
            className="mt-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors">
            Browse Restaurants
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
      <div className="space-y-3">
        {orders.map(order => (
          <Link key={order._id} href={`/orders/${order._id}`}
            className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-orange-200 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">{order.restaurantName}</p>
                <p className="text-sm text-gray-500">
                  {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </span>
                <p className="font-bold text-gray-900">₹{order.total.toFixed(0)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

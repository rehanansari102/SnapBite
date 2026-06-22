'use client'

import { useState, useTransition, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { getRestaurantOrders, updateOrderStatus } from '@/app/actions/order'
import type { Order, OrderStatus, Restaurant } from '@/app/lib/api'

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
  PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
  CONFIRMED: 'bg-blue-100 text-blue-700 border border-blue-200',
  PREPARING: 'bg-violet-100 text-violet-700 border border-violet-200',
  READY: 'bg-purple-100 text-purple-700 border border-purple-200',
  PICKED_UP: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  DELIVERED: 'bg-green-100 text-green-700 border border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border border-red-200',
}

const STATUS_TOP: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-400', CONFIRMED: 'bg-blue-500', PREPARING: 'bg-violet-500',
  READY: 'bg-purple-500', PICKED_UP: 'bg-indigo-500', DELIVERED: 'bg-green-500', CANCELLED: 'bg-red-400',
}

const STATUS_ICON: Record<OrderStatus, string> = {
  PENDING: '🕐', CONFIRMED: '✅', PREPARING: '👨‍🍳',
  READY: '📦', PICKED_UP: '🛵', DELIVERED: '🎉', CANCELLED: '❌',
}

// Next valid statuses a restaurant owner can advance to
const OWNER_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'PICKED_UP',
  PICKED_UP: 'DELIVERED',
}

const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP']

export default function RestaurantOrdersClient({ restaurants }: { restaurants: Restaurant[] }) {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('order')

  const [selectedId, setSelectedId] = useState<string>(restaurants[0]?._id ?? '')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const highlightRef = useRef<HTMLDivElement>(null)

  // When arriving via notification link, show all orders and scroll to the target
  useEffect(() => {
    if (!highlightId) return
    setFilter('all')
  }, [highlightId])

  useEffect(() => {
    if (!highlightId || !highlightRef.current) return
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightId, orders])

  const loadOrders = useCallback(async (restaurantId: string) => {
    if (!restaurantId) return
    setLoading(true)
    setError('')
    try {
      const data = await getRestaurantOrders(restaurantId)
      setOrders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders(selectedId)
  }, [selectedId, loadOrders])

  // Auto-refresh every 20s when there are active orders
  useEffect(() => {
    const hasActive = orders.some(o => ACTIVE_STATUSES.includes(o.status))
    if (!hasActive) return
    const interval = setInterval(() => loadOrders(selectedId), 20_000)
    return () => clearInterval(interval)
  }, [orders, selectedId, loadOrders])

  // Refresh immediately when the header bell receives a new order
  useEffect(() => {
    function handleNewOrder() { loadOrders(selectedId) }
    window.addEventListener('snapbite:new-order', handleNewOrder)
    return () => window.removeEventListener('snapbite:new-order', handleNewOrder)
  }, [selectedId, loadOrders])

  function handleAdvance(orderId: string, nextStatus: OrderStatus) {
    startTransition(async () => {
      try {
        const updated = await updateOrderStatus(orderId, nextStatus)
        setOrders(prev => prev.map(o => o._id === orderId ? updated : o))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update order')
      }
    })
  }

  const displayed = filter === 'active'
    ? orders.filter(o => ACTIVE_STATUSES.includes(o.status))
    : orders

  if (restaurants.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-16 flex flex-col items-center text-center gap-3">
        <div className="text-4xl">🏪</div>
        <h2 className="font-semibold text-gray-900">No restaurants yet</h2>
        <p className="text-sm text-gray-500">Create a restaurant first to start receiving orders.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Restaurant selector */}
      {restaurants.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {restaurants.map(r => (
            <button key={r._id}
              onClick={() => setSelectedId(r._id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedId === r._id
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-orange-300'
              }`}>
              {r.name}
            </button>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['active', 'all'] as const).map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {f === 'active' ? 'Active' : 'All Orders'}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading orders…</div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-12 flex flex-col items-center text-center gap-2">
          <div className="text-3xl">📭</div>
          <p className="font-semibold text-gray-900">
            {filter === 'active' ? 'No active orders' : 'No orders yet'}
          </p>
          <p className="text-sm text-gray-500">
            {filter === 'active' ? 'All caught up! Switch to "All Orders" to see history.' : 'Orders will appear here once customers place them.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(order => {
            const nextStatus = OWNER_NEXT[order.status]
            const isHighlighted = order._id === highlightId
            return (
              <div
                key={order._id}
                ref={isHighlighted ? highlightRef : null}
                className={`rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${
                  isHighlighted
                    ? 'border-orange-400 ring-2 ring-orange-300 ring-offset-2 shadow-orange-100'
                    : 'border-gray-100'
                }`}
              >
                <div className={`h-1 w-full ${STATUS_TOP[order.status]}`} />
                <div className="bg-white p-5 space-y-3">
                  {/* Order header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{STATUS_ICON[order.status]}</span>
                        <p className="font-extrabold text-gray-900 text-sm">
                          Order #{order._id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLOR[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="text-sm text-gray-600 space-y-0.5 bg-gray-50 rounded-xl p-3">
                    {order.items.map(item => (
                      <p key={item.menuItemId} className="flex justify-between">
                        <span className="font-medium">{item.name} × {item.quantity}</span>
                        <span className="font-semibold text-gray-700">₨{(item.price * item.quantity).toFixed(0)}</span>
                      </p>
                    ))}
                  </div>

                  {/* Delivery info */}
                  <p className="text-xs text-gray-400">
                    📍 {order.deliveryAddress.street}, {order.deliveryAddress.city}
                  </p>
                  {order.notes && (
                    <p className="text-xs text-gray-500 italic bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">📝 {order.notes}</p>
                  )}

                  {/* Total + action */}
                  <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                    <p className="font-black text-gray-900 text-lg">₨{order.total.toFixed(0)}</p>
                    {nextStatus && (
                      <button
                        onClick={() => handleAdvance(order._id, nextStatus)}
                        disabled={isPending}
                        className="px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all hover:scale-[1.02] shadow-md shadow-orange-200/60"
                        style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
                        Mark as {STATUS_LABEL[nextStatus]} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Refresh */}
      <button
        onClick={() => loadOrders(selectedId)}
        disabled={loading}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
        ↻ Refresh
      </button>
    </div>
  )
}

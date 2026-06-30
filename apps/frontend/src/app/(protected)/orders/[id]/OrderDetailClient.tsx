'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import { updateOrderStatus, getOrder } from '@/app/actions/order'
import { reorder } from '@/app/actions/cart'
import { getWsToken } from '@/app/actions/auth'
import type { Order, OrderStatus, PaymentStatus } from '@/app/lib/api'

const ORDER_SERVICE_WS = process.env.NEXT_PUBLIC_ORDER_SERVICE_WS ?? 'http://localhost:3005'

const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP']

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

const STATUS_ICON: Record<OrderStatus, string> = {
  PENDING: '🕐', CONFIRMED: '✅', PREPARING: '👨‍🍳',
  READY: '📦', PICKED_UP: '🛵', DELIVERED: '🎉', CANCELLED: '❌',
}

const STEP_BG: string[] = ['bg-amber-400','bg-blue-500','bg-violet-500','bg-purple-500','bg-indigo-500','bg-green-500']

const PAYMENT_BADGE: Record<NonNullable<PaymentStatus>, { label: string; cls: string; icon: string }> = {
  UNPAID:   { label: 'Unpaid',   cls: 'bg-gray-100 text-gray-600',   icon: '🕐' },
  PAID:     { label: 'Paid',     cls: 'bg-green-100 text-green-700', icon: '✅' },
  FAILED:   { label: 'Failed',   cls: 'bg-red-100 text-red-700',     icon: '❌' },
  REFUNDED: { label: 'Refunded', cls: 'bg-blue-100 text-blue-700',   icon: '↩️' },
}

const STEPS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED']

export default function OrderDetailClient({ order: initial }: { order: Order }) {
  const [order, setOrder] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [reorderMsg, setReorderMsg] = useState('')
  const router = useRouter()

  const canCancel = order.status === 'PENDING'
  const currentStepIdx = STEPS.indexOf(order.status)
  const isCancelled = order.status === 'CANCELLED'
  const isActive = ACTIVE_STATUSES.includes(order.status)
  const isBeingDelivered = order.status === 'PICKED_UP'

  // Live driver location tracking
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null)
  const socketRef = useRef<Socket | null>(null)

  // One socket for the whole active lifecycle: live status pushes + driver
  // location. Replaces polling — on (re)connect we resync once to catch
  // anything missed while offline.
  useEffect(() => {
    if (!isActive) { setDriverPos(null); return }

    let socket: Socket
    getWsToken().then(token => {
      socket = io(`${ORDER_SERVICE_WS}/orders`, {
        query: { orderId: order._id },
        auth: { token },
        withCredentials: true,
      })
      socketRef.current = socket

      socket.on('connect', async () => {
        try { setOrder(await getOrder(order._id)) } catch { /* keep current */ }
      })

      socket.on('order:status', (p: { status: OrderStatus; paymentStatus?: PaymentStatus; cancelReason?: string }) => {
        setOrder(prev => ({
          ...prev,
          status: p.status,
          ...(p.paymentStatus ? { paymentStatus: p.paymentStatus } : {}),
          ...(p.cancelReason ? { cancelReason: p.cancelReason } : {}),
        }))
      })

      socket.on('driver:location', (pos: { lat: number; lng: number }) => {
        setDriverPos(pos)
      })
    })

    return () => {
      socket?.disconnect()
      socketRef.current = null
    }
  }, [isActive, order._id])

  async function handleReorder() {
    setReordering(true)
    setReorderMsg('')
    const result = await reorder(
      order.items.map(i => ({ menuItemId: i.menuItemId, name: i.name, price: i.price, quantity: i.quantity, imageUrl: i.imageUrl })),
      order.restaurantId,
      order.restaurantName,
    )
    setReordering(false)
    if (result.success) {
      router.push('/cart')
    } else {
      setReorderMsg(result.message ?? 'Failed to reorder')
    }
  }

  function handleCancel() {
    if (!cancelReason.trim()) {
      setError('Please provide a cancellation reason.')
      return
    }
    setError('')
    startTransition(async () => {
      try {
        const updated = await updateOrderStatus(order._id, 'CANCELLED', cancelReason)
        setOrder(updated)
        setShowCancelForm(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cancel order')
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className={`h-1.5 w-full ${STEP_BG[Math.max(0, currentStepIdx)]}`} />
        <div className="bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{STATUS_ICON[order.status]}</span>
                <h1 className="text-xl font-extrabold text-gray-900">{order.restaurantName}</h1>
              </div>
              <p className="text-xs text-gray-400">
                Order #{order._id.slice(-8).toUpperCase()} ·{' '}
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status]}`}>
                {STATUS_LABEL[order.status]}
              </span>
              {order.paymentStatus && (() => {
                const badge = PAYMENT_BADGE[order.paymentStatus]
                return (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${badge.cls}`}>
                    <span>{badge.icon}</span>{badge.label}
                  </span>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Progress tracker */}
      {!isCancelled && (
        <div className="rounded-2xl border border-gray-100 shadow-sm p-5" style={{ background: 'linear-gradient(135deg, #f9fafb, #fff)' }}>
          <h2 className="font-extrabold text-gray-900 mb-4 text-sm">Order Progress</h2>
          <div className="flex items-center gap-0">
            {STEPS.map((step, idx) => {
              const done = idx <= currentStepIdx
              const last = idx === STEPS.length - 1
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 transition-all duration-300 shadow-sm ${
                    done ? `${STEP_BG[idx]} text-white scale-110` : 'bg-gray-100 text-gray-400'
                  }`}>
                    {idx + 1}
                  </div>
                  {!last && (
                    <div className={`h-1 flex-1 mx-1 rounded-full transition-colors duration-300 ${
                      idx < currentStepIdx ? 'bg-orange-400' : 'bg-gray-100'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step, idx) => (
              <p key={step} className={`text-[10px] text-center flex-1 last:flex-none last:text-right font-semibold ${
                idx <= currentStepIdx ? 'text-orange-600' : 'text-gray-400'
              }`}>
                {STATUS_LABEL[step].split(' ')[0]}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Live driver tracking — only when PICKED_UP */}
      {isBeingDelivered && (
        <div className="rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #eef2ff, #fff)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-sm font-extrabold text-indigo-700">
                {driverPos ? 'Driver location — live' : 'Waiting for driver location…'}
              </p>
            </div>
            {driverPos && (
              <a
                href={`https://www.google.com/maps?q=${driverPos.lat},${driverPos.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                Open in Maps ↗
              </a>
            )}
          </div>

          {driverPos ? (
            <iframe
              key={`${driverPos.lat.toFixed(4)},${driverPos.lng.toFixed(4)}`}
              title="Driver location"
              width="100%"
              height="260"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${driverPos.lng - 0.008},${driverPos.lat - 0.008},${driverPos.lng + 0.008},${driverPos.lat + 0.008}&layer=mapnik&marker=${driverPos.lat},${driverPos.lng}`}
              className="border-0 block"
            />
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-2 bg-indigo-50/50">
              <span className="text-3xl animate-bounce">🛵</span>
              <p className="text-xs text-indigo-400 font-medium">
                {order.driverEmail
                  ? `${order.driverEmail} is on the way`
                  : 'Your driver is on the way'}
              </p>
              <p className="text-[11px] text-indigo-300">Map will appear once the driver shares location</p>
            </div>
          )}
        </div>
      )}

      {isCancelled && order.cancelReason && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700">Order Cancelled</p>
          <p className="text-sm text-red-600 mt-0.5">Reason: {order.cancelReason}</p>
        </div>
      )}

      {/* Items */}
      <div className="rounded-2xl border border-orange-100 shadow-sm p-5 space-y-3" style={{ background: 'linear-gradient(135deg, #fff7ed, #fff)' }}>
        <h2 className="font-extrabold text-gray-900">🧾 Items</h2>
        <div className="divide-y divide-orange-50">
          {order.items.map(item => (
            <div key={item.menuItemId} className="flex justify-between py-2.5 text-sm">
              <span className="text-gray-700 font-medium">{item.name} × {item.quantity}</span>
              <span className="font-bold text-gray-900">₨{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-orange-100 pt-3 space-y-1.5 text-sm text-gray-600">
          <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">₨{order.subtotal.toFixed(0)}</span></div>
          <div className="flex justify-between"><span>Delivery fee</span><span className="font-semibold">₨{order.deliveryFee.toFixed(0)}</span></div>
          <div className="flex justify-between font-black text-orange-600 text-base pt-1">
            <span>Total</span><span>₨{order.total.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      <div className="rounded-2xl border border-blue-100 shadow-sm p-5" style={{ background: 'linear-gradient(135deg, #eff6ff, #fff)' }}>
        <h2 className="font-extrabold text-gray-900 mb-2">📍 Delivery Address</h2>
        <p className="text-sm text-gray-600">
          {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.country}
        </p>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Notes</h2>
          <p className="text-sm text-gray-600">{order.notes}</p>
        </div>
      )}

      {/* Cancel */}
      {canCancel && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          {!showCancelForm ? (
            <button onClick={() => setShowCancelForm(true)}
              className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors">
              Cancel this order
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900">Why are you cancelling?</p>
              <textarea rows={2} placeholder="e.g. Changed my mind, ordered by mistake..."
                value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-red-400" />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button onClick={handleCancel} disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {isPending ? 'Cancelling…' : 'Confirm Cancel'}
                </button>
                <button onClick={() => { setShowCancelForm(false); setError('') }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors">
                  Keep Order
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live indicator for active orders */}
      {isActive && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Auto-refreshing every 15s
        </div>
      )}

      {reorderMsg && (
        <p className="text-xs text-red-500 text-center">{reorderMsg}</p>
      )}

      <button
        onClick={handleReorder}
        disabled={reordering}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.01] disabled:opacity-50 text-white shadow-md shadow-orange-200/60"
        style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
      >
        {reordering ? 'Adding to cart…' : '🔁 Reorder'}
      </button>

      {(order.status === 'DELIVERED' || order.status === 'CANCELLED') && (
        <Link
          href={`/orders/${order._id}/receipt`}
          className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 2.5 2 2.5-2 2.5 2 2.5-2L19 21z"/>
          </svg>
          View Receipt
        </Link>
      )}

      <button onClick={() => router.push('/restaurants')}
        className="w-full py-2.5 rounded-xl border border-orange-200 text-orange-500 font-semibold text-sm hover:bg-orange-50 transition-colors">
        Browse Restaurants
      </button>
    </div>
  )
}

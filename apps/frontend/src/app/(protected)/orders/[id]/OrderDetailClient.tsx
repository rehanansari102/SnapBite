'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus } from '@/app/actions/order'
import type { Order, OrderStatus } from '@/app/lib/api'

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

const STEPS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED']

export default function OrderDetailClient({ order: initial }: { order: Order }) {
  const [order, setOrder] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const router = useRouter()

  const canCancel = order.status === 'PENDING'
  const currentStepIdx = STEPS.indexOf(order.status)
  const isCancelled = order.status === 'CANCELLED'

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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{order.restaurantName}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Order #{order._id.slice(-8).toUpperCase()} ·{' '}
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLOR[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      {/* Progress tracker */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Order Progress</h2>
          <div className="flex items-center gap-0">
            {STEPS.map((step, idx) => {
              const done = idx <= currentStepIdx
              const last = idx === STEPS.length - 1
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    done ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {idx + 1}
                  </div>
                  {!last && (
                    <div className={`h-0.5 flex-1 mx-1 transition-colors ${
                      idx < currentStepIdx ? 'bg-orange-500' : 'bg-gray-100'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step, idx) => (
              <p key={step} className={`text-[10px] text-center flex-1 last:flex-none last:text-right ${
                idx <= currentStepIdx ? 'text-orange-600 font-semibold' : 'text-gray-400'
              }`}>
                {STATUS_LABEL[step].split(' ')[0]}
              </p>
            ))}
          </div>
        </div>
      )}

      {isCancelled && order.cancelReason && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700">Order Cancelled</p>
          <p className="text-sm text-red-600 mt-0.5">Reason: {order.cancelReason}</p>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Items</h2>
        <div className="divide-y divide-gray-50">
          {order.items.map(item => (
            <div key={item.menuItemId} className="flex justify-between py-2.5 text-sm">
              <span className="text-gray-700">{item.name} × {item.quantity}</span>
              <span className="font-medium text-gray-900">₹{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm text-gray-600">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{order.subtotal.toFixed(0)}</span></div>
          <div className="flex justify-between"><span>Delivery fee</span><span>₹{order.deliveryFee.toFixed(0)}</span></div>
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
            <span>Total</span><span>₹{order.total.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-2">Delivery Address</h2>
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

      <button onClick={() => router.push('/restaurants')}
        className="w-full py-3 rounded-xl border border-orange-200 text-orange-500 font-semibold text-sm hover:bg-orange-50 transition-colors">
        Order Again
      </button>
    </div>
  )
}

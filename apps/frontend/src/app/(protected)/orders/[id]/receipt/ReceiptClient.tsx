'use client'

import Link from 'next/link'
import type { Order } from '@/app/lib/api'

const PAYMENT_LABEL: Record<string, string> = {
  COD: 'Cash on Delivery',
  CARD: 'Card (Stripe)',
}

const STATUS_LABEL: Record<string, string> = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  FAILED: 'Payment Failed',
  REFUNDED: 'Refunded',
}

export default function ReceiptClient({ order }: { order: Order }) {
  const orderId = order._id.slice(-8).toUpperCase()
  const placedAt = new Date(order.createdAt).toLocaleString('en-PK', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="max-w-xl mx-auto">
      {/* Toolbar — hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href={`/orders/${order._id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Back to order
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md shadow-orange-200/60 hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8" rx="1"/>
          </svg>
          Print / Save PDF
        </button>
      </div>

      {/* Receipt card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:rounded-none print:border-none">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-dashed border-gray-200">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-3xl mx-auto mb-3 print:mx-auto">
            🍔
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">SnapBite</h1>
          <p className="text-xs text-gray-400 mt-0.5">snapbite.dev · Your food, fast</p>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Order meta */}
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-gray-400 font-medium">Order</span>
            <span className="font-extrabold text-gray-900 text-right">#{orderId}</span>

            <span className="text-gray-400 font-medium">Date</span>
            <span className="font-semibold text-gray-700 text-right">{placedAt}</span>

            <span className="text-gray-400 font-medium">Restaurant</span>
            <span className="font-semibold text-gray-700 text-right">{order.restaurantName}</span>

            <span className="text-gray-400 font-medium">Status</span>
            <span className={`font-bold text-right ${order.status === 'DELIVERED' ? 'text-green-600' : order.status === 'CANCELLED' ? 'text-red-600' : 'text-orange-600'}`}>
              {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
            </span>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Items</p>
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.menuItemId} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.name}
                    <span className="text-gray-400 ml-1">× {item.quantity}</span>
                  </span>
                  <span className="font-semibold text-gray-900">₨{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="font-semibold">₨{order.subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Delivery fee</span>
              <span className="font-semibold">₨{order.deliveryFee.toFixed(0)}</span>
            </div>
            {order.promoCode && order.discountAmount !== undefined && order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center gap-1">
                  🎟️ <span className="font-mono font-bold">{order.promoCode}</span>
                </span>
                <span className="font-bold">−₨{order.discountAmount.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-orange-600 pt-1 border-t border-dashed border-gray-200">
              <span>Total</span>
              <span>₨{order.total.toFixed(0)}</span>
            </div>
          </div>

          {/* Commission breakdown — visible when data exists */}
          {order.platformFee !== undefined && order.platformFee > 0 && (
            <div className="border-t border-dashed border-gray-200 pt-4 space-y-1.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Earnings Breakdown</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Platform fee ({order.platformFeePercent ?? 10}%)</span>
                <span className="font-semibold text-red-500">−₨{order.platformFee.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-green-600">
                <span>Restaurant earnings</span>
                <span>₨{order.restaurantEarnings?.toFixed(0)}</span>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="border-t border-dashed border-gray-200 pt-4 grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-gray-400 font-medium">Payment method</span>
            <span className="font-semibold text-gray-700 text-right">
              {PAYMENT_LABEL[order.paymentMethod ?? 'COD']}
            </span>

            <span className="text-gray-400 font-medium">Payment status</span>
            <span className={`font-bold text-right ${
              order.paymentStatus === 'PAID' ? 'text-green-600' :
              order.paymentStatus === 'REFUNDED' ? 'text-blue-600' :
              order.paymentStatus === 'FAILED' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {STATUS_LABEL[order.paymentStatus ?? 'UNPAID']}
            </span>
          </div>

          {/* Delivery address */}
          <div className="border-t border-dashed border-gray-200 pt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Delivered to</p>
            <p className="text-sm text-gray-700">
              {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.country}
            </p>
          </div>

          {/* Refund note */}
          {order.paymentStatus === 'REFUNDED' && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700 font-medium">
              ↩ A full refund has been issued to your original payment method.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">Thank you for ordering with SnapBite 🙏</p>
          <p className="text-xs text-gray-300 mt-0.5">This is your order receipt · #{orderId}</p>
        </div>
      </div>
    </div>
  )
}

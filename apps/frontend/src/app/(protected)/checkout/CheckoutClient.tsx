'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { placeOrder } from '@/app/actions/order'
import type { Cart, UserAddress } from '@/app/lib/api'

export default function CheckoutClient({
  cart,
  addresses,
}: {
  cart: Cart
  addresses: UserAddress[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')

  const defaultAddress = addresses.find(a => a.isDefault) ?? addresses[0]
  const [selectedAddressId, setSelectedAddressId] = useState<string>(defaultAddress?.id ?? '')
  const [manualAddress, setManualAddress] = useState({ street: '', city: '', country: 'IN' })
  const useManual = addresses.length === 0

  const deliveryFee = 30
  const total = cart.subtotal + deliveryFee

  function handleSubmit() {
    setError('')

    const address = useManual
      ? manualAddress
      : addresses.find(a => a.id === selectedAddressId)

    if (!address || !address.street || !address.city) {
      setError('Please select or enter a delivery address.')
      return
    }

    startTransition(async () => {
      try {
        const order = await placeOrder({
          street: address.street,
          city: address.city,
          country: address.country,
          lat: 'lat' in address ? address.lat : undefined,
          lng: 'lng' in address ? address.lng : undefined,
        }, notes || undefined)
        router.push(`/orders/${order._id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to place order')
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

      {/* Delivery Address */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Delivery Address</h2>

        {addresses.length > 0 ? (
          <div className="space-y-2">
            {addresses.map(addr => (
              <label key={addr.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedAddressId === addr.id
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-200'
                }`}>
                <input type="radio" name="address" value={addr.id}
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                  className="mt-0.5 accent-orange-500" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">{addr.label}</p>
                  <p className="text-sm text-gray-500">{addr.street}, {addr.city}, {addr.country}</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <input placeholder="Street address" value={manualAddress.street}
              onChange={e => setManualAddress(p => ({ ...p, street: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
            <div className="flex gap-3">
              <input placeholder="City" value={manualAddress.city}
                onChange={e => setManualAddress(p => ({ ...p, city: e.target.value }))}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
              <input placeholder="Country" value={manualAddress.country}
                onChange={e => setManualAddress(p => ({ ...p, country: e.target.value }))}
                className="w-24 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
            </div>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Order from {cart.restaurantName}</h2>
        <div className="divide-y divide-gray-50">
          {cart.items.map(item => (
            <div key={item.menuItemId} className="flex justify-between py-2 text-sm">
              <span className="text-gray-700">{item.name} × {item.quantity}</span>
              <span className="font-medium text-gray-900">₹{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm text-gray-600">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{cart.subtotal.toFixed(0)}</span></div>
          <div className="flex justify-between"><span>Delivery fee</span><span>₹{deliveryFee}</span></div>
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
            <span>Total</span><span>₹{total.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Order Notes (optional)</h2>
        <textarea rows={2} placeholder="e.g. No onions, extra spicy..."
          value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-orange-400" />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      <button onClick={handleSubmit} disabled={isPending}
        className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-bold text-base hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm shadow-orange-200">
        {isPending ? 'Placing order…' : `Place Order · ₹${total.toFixed(0)}`}
      </button>
    </div>
  )
}

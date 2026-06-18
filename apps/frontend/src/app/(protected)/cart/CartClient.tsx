'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateCartItem, removeCartItem, clearCart } from '@/app/actions/order'
import type { Cart } from '@/app/lib/api'

export default function CartClient({ initialCart }: { initialCart: Cart | null }) {
  const [cart, setCart] = useState<Cart | null>(initialCart)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleQuantity(menuItemId: string, delta: number, current: number) {
    const next = current + delta
    if (next <= 0) {
      handleRemove(menuItemId)
      return
    }
    startTransition(async () => {
      const updated = await updateCartItem(menuItemId, next)
      setCart(updated)
    })
  }

  function handleRemove(menuItemId: string) {
    startTransition(async () => {
      await removeCartItem(menuItemId)
      setCart(prev => {
        if (!prev) return null
        const items = prev.items.filter(i => i.menuItemId !== menuItemId)
        if (items.length === 0) return null
        const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
        return { ...prev, items, subtotal }
      })
    })
  }

  function handleClear() {
    startTransition(async () => {
      await clearCart()
      setCart(null)
    })
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-4xl">🛒</div>
        <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="text-gray-500">Browse restaurants and add items to get started.</p>
        <Link href="/restaurants" className="mt-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors">
          Browse Restaurants
        </Link>
      </div>
    )
  }

  const deliveryFee = 30
  const total = cart.subtotal + deliveryFee

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          <p className="text-sm text-gray-500 mt-0.5">From {cart.restaurantName}</p>
        </div>
        <button onClick={handleClear} disabled={isPending}
          className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-50">
          Clear cart
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {cart.items.map(item => (
          <div key={item.menuItemId} className="flex items-center gap-4 p-4">
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-sm text-orange-500 font-semibold">₹{item.price}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleQuantity(item.menuItemId, -1, item.quantity)}
                disabled={isPending}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-orange-400 hover:text-orange-500 disabled:opacity-50 transition-colors">
                −
              </button>
              <span className="w-6 text-center font-semibold text-gray-900">{item.quantity}</span>
              <button onClick={() => handleQuantity(item.menuItemId, 1, item.quantity)}
                disabled={isPending}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-orange-400 hover:text-orange-500 disabled:opacity-50 transition-colors">
                +
              </button>
            </div>
            <p className="w-16 text-right font-semibold text-gray-900">
              ₹{(item.price * item.quantity).toFixed(0)}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Order Summary</h2>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span><span>₹{cart.subtotal.toFixed(0)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Delivery fee</span><span>₹{deliveryFee}</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
          <span>Total</span><span>₹{total.toFixed(0)}</span>
        </div>
      </div>

      <button onClick={() => router.push('/checkout')} disabled={isPending}
        className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-bold text-base hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm shadow-orange-200">
        Proceed to Checkout →
      </button>
    </div>
  )
}

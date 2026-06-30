'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateCartItem, removeCartItem, clearCart } from '@/app/actions/order'
import type { Cart } from '@/app/lib/api'
import { useCartStore } from '@/app/lib/store'

function cartItemCount(cart: Cart | null) {
  return cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0
}

export default function CartClient({ initialCart }: { initialCart: Cart | null }) {
  const [cart, setCart] = useState<Cart | null>(initialCart)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const setCount = useCartStore(s => s.setCount)

  useEffect(() => { setCount(cartItemCount(cart)) }, [cart, setCount])

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

      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        {cart.items.map((item, idx) => (
          <div key={item.menuItemId}
            className={`flex items-center gap-4 p-4 transition-colors hover:bg-orange-50/30 ${idx !== 0 ? 'border-t border-gray-50' : ''}`}
            style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 shadow-sm" />
            ) : (
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)' }}>🍽️</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-gray-900 truncate">{item.name}</p>
              <p className="text-sm font-black text-orange-500 mt-0.5">₨{item.price}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleQuantity(item.menuItemId, -1, item.quantity)}
                disabled={isPending}
                className="w-8 h-8 rounded-full border-2 border-orange-200 flex items-center justify-center text-orange-500 hover:bg-orange-100 disabled:opacity-50 transition-colors font-bold">
                −
              </button>
              <span className="w-7 text-center font-black text-gray-900">{item.quantity}</span>
              <button onClick={() => handleQuantity(item.menuItemId, 1, item.quantity)}
                disabled={isPending}
                className="w-8 h-8 rounded-full text-white flex items-center justify-center disabled:opacity-50 transition-all hover:scale-110 font-bold shadow-md shadow-orange-200/60"
                style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
                +
              </button>
            </div>
            <p className="w-16 text-right font-black text-gray-900">
              ₨{(item.price * item.quantity).toFixed(0)}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm border border-orange-100" style={{ background: 'linear-gradient(135deg, #fff7ed, #fff)' }}>
        <div className="p-5 space-y-3">
          <h2 className="font-extrabold text-gray-900">Order Summary</h2>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span><span className="font-semibold text-gray-700">₨{cart.subtotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Delivery fee</span><span className="font-semibold text-gray-700">₨{deliveryFee}</span>
          </div>
          <div className="border-t border-orange-100 pt-3 flex justify-between font-black text-gray-900 text-lg">
            <span>Total</span><span className="text-orange-600">₨{total.toFixed(0)}</span>
          </div>
        </div>
      </div>

      <button onClick={() => router.push('/checkout')} disabled={isPending}
        className="w-full py-3.5 rounded-xl text-white font-black text-base disabled:opacity-50 transition-all hover:scale-[1.01] shadow-lg shadow-orange-200/60"
        style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
        Proceed to Checkout →
      </button>
    </div>
  )
}

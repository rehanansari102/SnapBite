'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Restaurant, MenuItem } from '@/app/lib/api'
import { addToCart } from '@/app/actions/cart'
import { useCartStore } from '@/app/lib/store'

interface Props {
  restaurant: Restaurant
  menuItems: MenuItem[]
}

export default function RestaurantMenuClient({ restaurant, menuItems }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [adding, setAdding] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'conflict' } | null>(null)
  const { count: cartCount, setCount: setCartCount } = useCartStore()

  const grouped = menuItems
    .filter(i => i.isAvailable)
    .reduce<Record<string, MenuItem[]>>((acc, item) => {
      ;(acc[item.category] ??= []).push(item)
      return acc
    }, {})

  function showToast(message: string, type: 'success' | 'error' | 'conflict') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  function handleAdd(item: MenuItem) {
    setAdding(item._id)
    startTransition(async () => {
      const result = await addToCart({
        menuItemId: item._id,
        name: item.name,
        price: item.price,
        quantity: 1,
        restaurantId: restaurant._id,
        restaurantName: restaurant.name,
        imageUrl: item.imageUrl,
      })
      setAdding(null)
      if (result.success) {
        setCartCount(result.cart?.items.reduce((s, i) => s + i.quantity, 0) ?? cartCount)
        showToast(`${item.name} added to cart`, 'success')
      } else if (result.conflict) {
        showToast('Your cart has items from another restaurant. Go to cart to clear it first.', 'conflict')
      } else {
        showToast(result.message ?? 'Failed to add item', 'error')
      }
    })
  }

  if (menuItems.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
        <p className="text-4xl mb-3">🍽️</p>
        <p className="text-gray-500 font-medium">No menu items yet.</p>
        <p className="text-gray-400 text-sm mt-1">Check back soon!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cart badge strip */}
      {cartCount > 0 && (
        <button
          onClick={() => router.push('/cart')}
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-white font-bold shadow-lg shadow-orange-200/60 hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
        >
          <span>🛒 {cartCount} item{cartCount !== 1 ? 's' : ''} in cart</span>
          <span className="text-sm font-semibold">View cart →</span>
        </button>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 animate-fade-up ${
          toast.type === 'success' ? 'bg-gray-900 text-white' :
          toast.type === 'conflict' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'success' ? '✓' : toast.type === 'conflict' ? '⚠️' : '✕'} {toast.message}
        </div>
      )}

      {/* Menu sections */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h2 className="text-base font-black mb-3 px-1 flex items-center gap-2">
            <span className="text-gray-800">{category}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">{items.length}</span>
          </h2>
          <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            {items.map((item, idx) => (
              <div key={item._id}
                className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-orange-50/40 ${idx !== 0 ? 'border-t border-gray-50' : ''}`}
                style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-100 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shrink-0 border border-orange-100" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)' }}>🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-gray-900">{item.name}</p>
                  {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-snug">{item.description}</p>}
                  <p className="text-sm font-black mt-1.5" style={{ color: '#ea580c' }}>₨ {item.price.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleAdd(item)}
                  disabled={isPending || adding === item._id || !restaurant.isOpen}
                  className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    adding === item._id
                      ? 'bg-orange-100 text-orange-400'
                      : 'text-white hover:scale-110 shadow-md shadow-orange-200/60'
                  }`}
                  style={adding !== item._id ? { background: 'linear-gradient(135deg, #ea580c, #f97316)' } : {}}
                  title={!restaurant.isOpen ? 'Restaurant is closed' : 'Add to cart'}
                >
                  {adding === item._id ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : '+'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!restaurant.isOpen && (
        <p className="text-center text-sm text-gray-400 py-2">This restaurant is currently closed. You can browse the menu but cannot order right now.</p>
      )}
    </div>
  )
}

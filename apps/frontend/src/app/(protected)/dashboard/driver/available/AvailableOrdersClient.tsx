'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getAvailableOrders, acceptOrder, setDriverAvailability } from '@/app/actions/driver'
import type { Order } from '@/app/lib/api'

export default function AvailableOrdersClient({
  initialOrders,
  initialAvailable,
}: {
  initialOrders: Order[]
  initialAvailable: boolean
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isOnline, setIsOnline] = useState(initialAvailable)
  const [togglingAvail, setTogglingAvail] = useState(false)
  const router = useRouter()

  // Auto-refresh every 30s — only while online
  useEffect(() => {
    if (!isOnline) return
    const interval = setInterval(() => {
      startTransition(async () => {
        const fresh = await getAvailableOrders().catch(() => null)
        if (fresh) setOrders(fresh)
      })
    }, 30_000)
    return () => clearInterval(interval)
  }, [isOnline])

  async function toggleAvailability() {
    setError(null)
    const next = !isOnline
    setTogglingAvail(true)
    try {
      const res = await setDriverAvailability(next)
      setIsOnline(res.isAvailable)
      if (res.isAvailable) {
        // Just came online — pull a fresh list immediately
        const fresh = await getAvailableOrders().catch(() => null)
        if (fresh) setOrders(fresh)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update availability')
    } finally {
      setTogglingAvail(false)
    }
  }

  async function handleAccept(orderId: string) {
    setError(null)
    setAccepting(orderId)
    try {
      await acceptOrder(orderId)
      router.push('/dashboard/driver/active')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept order')
      setAccepting(null)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Available Pickups</h1>
          <p className="text-sm text-gray-400 mt-0.5">Orders ready for pickup — refreshes every 30s</p>
        </div>
        <button
          onClick={() => startTransition(async () => {
            const fresh = await getAvailableOrders().catch(() => null)
            if (fresh) setOrders(fresh)
          })}
          disabled={isPending || !isOnline}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Availability toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {isOnline ? "You're online" : "You're offline"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isOnline ? 'Restaurants can assign deliveries to you' : 'Go online to receive and accept deliveries'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleAvailability}
          disabled={togglingAvail}
          aria-pressed={isOnline}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
            isOnline ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
          }`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${isOnline ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {!isOnline ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-3xl">
            😴
          </div>
          <p className="font-bold text-gray-700 dark:text-gray-300">You&apos;re offline</p>
          <p className="text-sm text-gray-400">Flip the switch above to go online and see available pickups</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-3xl">
            🛵
          </div>
          <p className="font-bold text-gray-700 dark:text-gray-300">No orders available right now</p>
          <p className="text-sm text-gray-400">Check back soon — new orders appear automatically</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order._id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Top bar */}
              <div className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-extrabold text-gray-900 dark:text-white text-lg leading-tight truncate">
                    {order.restaurantName}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5 truncate">
                    {order.deliveryAddress.street}, {order.deliveryAddress.city}
                  </p>
                </div>
                <span className="flex-shrink-0 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold">
                  READY
                </span>
              </div>

              {/* Items summary */}
              <div className="px-5 pb-3 border-t border-gray-50 dark:border-gray-700/60">
                <div className="pt-3 flex flex-wrap gap-1.5">
                  {order.items.slice(0, 3).map(item => (
                    <span key={item.menuItemId} className="px-2.5 py-1 bg-gray-50 dark:bg-white/5 rounded-lg text-xs text-gray-600 dark:text-gray-400 font-medium">
                      {item.name} ×{item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="px-2.5 py-1 bg-gray-50 dark:bg-white/5 rounded-lg text-xs text-gray-400 font-medium">
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-gray-50/80 dark:bg-white/5 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Order value</p>
                    <p className="font-extrabold text-gray-900 dark:text-white">₨{order.total.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Items</p>
                    <p className="font-bold text-gray-700 dark:text-gray-300">{order.items.reduce((s, i) => s + i.quantity, 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Placed</p>
                    <p className="font-medium text-gray-500 dark:text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleAccept(order._id)}
                  disabled={accepting !== null}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
                >
                  {accepting === order._id ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Accepting…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      Accept
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateDeliveryStatus } from '@/app/actions/driver'
import { getWsToken } from '@/app/actions/auth'
import { io, type Socket } from 'socket.io-client'
import type { Order } from '@/app/lib/api'
import { useDriverStore } from '@/app/lib/store'

const ORDER_SERVICE_WS = process.env.NEXT_PUBLIC_ORDER_SERVICE_WS ?? 'http://localhost:3005'

const STATUS_STEPS = ['CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED'] as const

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    READY:     { label: 'Ready for pickup', color: 'bg-blue-100 text-blue-700' },
    PICKED_UP: { label: 'Picked up', color: 'bg-orange-100 text-orange-700' },
    DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
  }
  const s = map[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.color}`}>{s.label}</span>
  )
}

export default function ActiveDeliveryClient({ order: initialOrder }: { order: Order | null }) {
  const [order, setOrder] = useState(initialOrder)
  const { gpsActive: gpsActiveMap, setGpsActive: storeSetGps, clearGps } = useDriverStore()
  const gpsActive = initialOrder ? (gpsActiveMap[initialOrder._id] ?? false) : false
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const socketRef = useRef<Socket | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const router = useRouter()

  // Connect socket and broadcast GPS when active
  useEffect(() => {
    if (!gpsActive || !order) return

    let socket: Socket

    getWsToken().then(token => {
      socket = io(`${ORDER_SERVICE_WS}/orders`, {
        auth: { token },
        withCredentials: true,
      })
      socketRef.current = socket

      socket.on('connect', () => {
        // Start watching position once socket is ready
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            socket.emit('driver:location', {
              orderId: order._id,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            })
          },
          (err) => {
            setGpsError(err.message)
            if (order) storeSetGps(order._id, false)
          },
          { enableHighAccuracy: true, maximumAge: 5000 },
        )
      })
    })

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      socket?.disconnect()
      socketRef.current = null
    }
  }, [gpsActive, order])

  function toggleGps() {
    if (!order) return
    if (gpsActive) {
      storeSetGps(order._id, false)
      setGpsError(null)
    } else {
      if (!navigator.geolocation) {
        setGpsError('Geolocation is not supported by your browser')
        return
      }
      setGpsError(null)
      storeSetGps(order._id, true)
    }
  }

  function handleStatusUpdate(status: 'PICKED_UP' | 'DELIVERED') {
    if (!order) return
    setActionError(null)
    startTransition(async () => {
      try {
        const updated = await updateDeliveryStatus(order._id, status)
        setOrder(updated)
        if (status === 'DELIVERED') {
          clearGps(order._id)
          router.refresh()
        }
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Failed to update status')
      }
    })
  }

  if (!order) {
    return (
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Active Delivery</h1>
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-3xl">
            🛵
          </div>
          <p className="font-bold text-gray-700 dark:text-gray-300">No active delivery</p>
          <p className="text-sm text-gray-400">Accept an order to start delivering</p>
          <Link
            href="/dashboard/driver/available"
            className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
          >
            View available pickups
          </Link>
        </div>
      </div>
    )
  }

  const canPickUp = order.status === 'READY'
  const canDeliver = order.status === 'PICKED_UP'

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Active Delivery</h1>
        <StatusBadge status={order.status} />
      </div>

      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
          {actionError}
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-1">
          {STATUS_STEPS.map((step, i) => {
            const stepIndex = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number])
            const done = i <= stepIndex
            const active = i === stepIndex
            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                  done ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                } ${active ? 'ring-4 ring-orange-200' : ''}`}>
                  {done && !active ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  ) : i + 1}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-1 rounded-full transition-colors ${i < stepIndex ? 'bg-orange-500' : 'bg-gray-100 dark:bg-gray-700'}`} />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-2">
          {STATUS_STEPS.map(step => (
            <p key={step} className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide text-center" style={{ width: `${100 / STATUS_STEPS.length}%` }}>
              {step.replace('_', ' ')}
            </p>
          ))}
        </div>
      </div>

      {/* Order details card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700/60">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pickup from</p>
          <p className="font-extrabold text-gray-900 dark:text-white text-lg">{order.restaurantName}</p>
        </div>

        <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700/60">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Deliver to</p>
          <p className="font-semibold text-gray-800 dark:text-gray-200">
            {order.deliveryAddress.street}, {order.deliveryAddress.city}
          </p>
        </div>

        <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700/60">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Items</p>
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.menuItemId} className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {item.name} <span className="text-gray-400">×{item.quantity}</span>
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ₨{(item.price * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-600 flex justify-between text-sm font-black text-orange-600">
            <span>Total</span>
            <span>₨{order.total.toFixed(0)}</span>
          </div>
        </div>

        {/* GPS toggle */}
        <div className="px-5 py-4 bg-gray-50/80 dark:bg-white/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Live location</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {gpsActive ? 'Broadcasting your location to the customer' : 'Let the customer track your position'}
              </p>
              {gpsError && <p className="text-xs text-red-500 mt-1">{gpsError}</p>}
            </div>
            <button
              onClick={toggleGps}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                gpsActive ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${gpsActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {canPickUp && (
          <button
            onClick={() => handleStatusUpdate('PICKED_UP')}
            disabled={isPending}
            className="w-full py-4 rounded-2xl font-black text-white text-base disabled:opacity-60 transition-all hover:scale-[1.01] shadow-lg shadow-blue-200/60"
            style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}
          >
            {isPending ? 'Updating…' : '📦 Mark as Picked Up'}
          </button>
        )}

        {canDeliver && (
          <button
            onClick={() => handleStatusUpdate('DELIVERED')}
            disabled={isPending}
            className="w-full py-4 rounded-2xl font-black text-white text-base disabled:opacity-60 transition-all hover:scale-[1.01] shadow-lg shadow-green-200/60"
            style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}
          >
            {isPending ? 'Updating…' : '✅ Mark as Delivered'}
          </button>
        )}

        {order.status === 'DELIVERED' && (
          <Link
            href="/dashboard/driver/available"
            className="w-full py-4 rounded-2xl font-black text-white text-base text-center transition-all hover:scale-[1.01] shadow-lg shadow-orange-200/60"
            style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
          >
            🛵 Find next delivery
          </Link>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface OrderNotification {
  _id: string
  restaurantName: string
  total: number
  items: { name: string; quantity: number }[]
}

const ORDER_SERVICE_WS = process.env.NEXT_PUBLIC_ORDER_SERVICE_WS ?? 'http://localhost:3005'

export default function OrderNotifier({
  restaurantId,
  onNewOrder,
}: {
  restaurantId: string
  onNewOrder?: () => void
}) {
  const [toasts, setToasts] = useState<(OrderNotification & { key: number })[]>([])
  // Keep ref so the socket handler always calls the latest version without reconnecting
  const onNewOrderRef = useRef(onNewOrder)
  useEffect(() => { onNewOrderRef.current = onNewOrder }, [onNewOrder])

  useEffect(() => {
    if (!restaurantId) return

    const socket: Socket = io(`${ORDER_SERVICE_WS}/orders`, {
      query: { restaurantId },
      // Let Socket.io negotiate transport (polling → websocket upgrade)
    })

    socket.on('connect', () => console.log('[OrderNotifier] connected', socket.id))
    socket.on('connect_error', (err) => console.error('[OrderNotifier] connect error', err.message))

    socket.on('new_order', (order: OrderNotification) => {
      onNewOrderRef.current?.()
      // Play notification sound
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      } catch { /* AudioContext may be blocked until user interaction */ }

      const key = Date.now()
      setToasts(prev => [...prev, { ...order, key }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.key !== key)), 8000)
    })

    return () => { socket.disconnect() }
  }, [restaurantId])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {toasts.map(toast => (
        <div
          key={toast.key}
          className="bg-white rounded-2xl shadow-2xl border border-orange-200 overflow-hidden animate-fade-up"
        >
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #ea580c, #f97316)' }} />
          <div className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛒</span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-gray-900 text-sm">New Order!</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {toast.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                </p>
                <p className="text-sm font-black text-orange-600 mt-1">₨{toast.total.toFixed(0)}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.key !== toast.key))}
                className="text-gray-300 hover:text-gray-500 text-lg leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

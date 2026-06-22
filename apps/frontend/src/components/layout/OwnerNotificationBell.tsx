'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { io, Socket } from 'socket.io-client'
import { getWsToken } from '@/app/actions/auth'

interface OrderNotification {
  _id: string
  restaurantName: string
  total: number
  items: { name: string; quantity: number }[]
}

interface StoredNotification extends OrderNotification {
  id: number
  read: boolean
  receivedAt: string
}

const ORDER_SERVICE_WS = process.env.NEXT_PUBLIC_ORDER_SERVICE_WS ?? 'http://localhost:3005'

// Module-level singleton — survives component remounts and hot reloads.
// The context is never closed; gesture listeners keep it running permanently.
let _audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!_audioCtx || _audioCtx.state === 'closed') {
    try { _audioCtx = new AudioContext() } catch { return null }
  }
  return _audioCtx
}

// Re-unlock on EVERY gesture — Chrome can re-suspend an idle context.
if (typeof window !== 'undefined') {
  const keepUnlocked = () => { getAudioCtx()?.resume().catch(() => {}) }
  window.addEventListener('click',      keepUnlocked, true)
  window.addEventListener('keydown',    keepUnlocked, true)
  window.addEventListener('touchstart', keepUnlocked, true)
}

export default function OwnerNotificationBell({ restaurantIds }: { restaurantIds: string[] }) {
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [toasts, setToasts] = useState<StoredNotification[]>([])
  const [open, setOpen] = useState(false)
  const [wsToken, setWsToken] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef(0)

  // Fetch the access token server-side so it can be passed to the socket
  // without needing to read the HttpOnly cookie from JavaScript directly.
  useEffect(() => {
    getWsToken().then(t => setWsToken(t ?? null))
  }, [])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    if (restaurantIds.length === 0 || wsToken === null) return

    const sockets: Socket[] = restaurantIds.map(restaurantId => {
      const socket: Socket = io(`${ORDER_SERVICE_WS}/orders`, {
        query: { restaurantId },
        auth: { token: wsToken },
        withCredentials: true,
      })

      socket.on('connect', () =>
        console.log(`[NotifBell] connected for restaurant ${restaurantId}`)
      )
      socket.on('connect_error', (err) =>
        console.error(`[NotifBell] connect error for restaurant ${restaurantId}:`, err.message)
      )

      socket.on('new_order', (order: OrderNotification) => {
        // Only play if the context was already unlocked by a prior user gesture
        const ctx = getAudioCtx()
        if (ctx && ctx.state === 'running') {
          try {
            // Three-note ascending chime (C5 → E5 → G5), Fiverr-style
            const notes = [523.25, 659.25, 783.99]
            notes.forEach((freq, i) => {
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.type = 'sine'
              osc.connect(gain)
              gain.connect(ctx.destination)
              const t = ctx.currentTime + i * 0.18
              osc.frequency.setValueAtTime(freq, t)
              gain.gain.setValueAtTime(0, t)
              gain.gain.linearRampToValueAtTime(0.45, t + 0.01)
              gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
              osc.start(t)
              osc.stop(t + 0.6)
            })
          } catch { /* ignore */ }
        }

        const id = ++counterRef.current
        const stored: StoredNotification = {
          ...order,
          id,
          read: false,
          receivedAt: new Date().toISOString(),
        }

        setNotifications(prev => [stored, ...prev].slice(0, 20))

        // Show toast — auto-dismiss after 8 s
        setToasts(prev => [...prev, stored])
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 8000)

        window.dispatchEvent(new CustomEvent('snapbite:new-order', { detail: order }))
      })

      return socket
    })

    return () => { sockets.forEach(s => s.disconnect()) }
  }, [restaurantIds])

  const unread = notifications.filter(n => !n.read).length

  function handleToggle() {
    setOpen(v => !v)
    if (!open) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  function dismissToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const toastStack = (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto w-80 rounded-2xl shadow-2xl border border-orange-100 overflow-hidden animate-fade-up"
            style={{ background: '#fff' }}
          >
            {/* colour bar */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg,#ea580c,#f97316)' }} />
            <div className="flex items-start">
              <Link
                href={`/dashboard/orders?order=${toast._id}`}
                onClick={() => dismissToast(toast.id)}
                className="flex items-start gap-3 flex-1 min-w-0 p-4 hover:bg-orange-50/40 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xl animate-bounce">🛒</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-extrabold text-gray-900 text-sm">New Order!</p>
                    {toast.restaurantName && (
                      <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full flex-shrink-0 truncate max-w-[100px]">
                        {toast.restaurantName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {toast.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                  </p>
                  <p className="text-sm font-black text-orange-600 mt-1">₨{toast.total.toFixed(0)}</p>
                  <p className="text-[11px] font-bold text-orange-400 mt-1">Tap to view order →</p>
                </div>
              </Link>
              <button
                onClick={() => dismissToast(toast.id)}
                className="p-3 text-gray-300 hover:text-gray-500 text-lg leading-none flex-shrink-0 self-start mt-1"
              >
                ×
              </button>
            </div>
          </div>
        ))}
    </div>
  )

  return (
    <>
      {createPortal(toastStack, document.body)}

      {/* ── Bell button + dropdown ── */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={handleToggle}
          className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
          aria-label="Order notifications"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-md animate-pulse">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl shadow-gray-200/60 dark:shadow-black/40 overflow-hidden animate-fade-up z-50">
            <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-400 flex items-center justify-between">
              <p className="text-sm font-bold text-white">Order Notifications</p>
              {notifications.length > 0 && (
                <button
                  onClick={() => setNotifications([])}
                  className="text-[11px] text-orange-100 hover:text-white transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/60">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                  <span className="text-3xl">🔔</span>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No notifications yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">New orders will appear here instantly</p>
                </div>
              ) : (
                notifications.map(n => (
                  <Link
                    key={n.id}
                    href={`/dashboard/orders?order=${n._id}`}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 transition-colors hover:bg-orange-50/80 dark:hover:bg-orange-900/30 ${
                      n.read ? 'bg-white dark:bg-gray-800' : 'bg-orange-50/60 dark:bg-orange-900/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5 flex-shrink-0">🛒</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">New Order!</p>
                          <p className="text-[11px] text-gray-400 flex-shrink-0">
                            {new Date(n.receivedAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {n.restaurantName && (
                          <p className="text-[11px] text-orange-500 font-medium mt-0.5">{n.restaurantName}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {n.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm font-black text-orange-500">₨{n.total.toFixed(0)}</p>
                          <span className="text-[11px] text-orange-400 font-semibold">View order →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60">
              <Link
                href="/dashboard/orders"
                onClick={() => setOpen(false)}
                className="text-xs text-orange-500 font-semibold hover:text-orange-600 transition-colors"
              >
                View all orders →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

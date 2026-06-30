import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Notifications ─────────────────────────────────────────────────────────────

export interface StoredNotification {
  id: number
  _id: string
  restaurantName: string
  total: number
  items: { name: string; quantity: number }[]
  read: boolean
  receivedAt: string
}

interface NotificationStore {
  notifications: StoredNotification[]
  add: (n: Omit<StoredNotification, 'id' | 'read' | 'receivedAt'>) => void
  markAllRead: () => void
  clear: () => void
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      add: (n) => {
        const stored: StoredNotification = {
          ...n,
          id: Date.now(),
          read: false,
          receivedAt: new Date().toISOString(),
        }
        set(state => ({ notifications: [stored, ...state.notifications].slice(0, 20) }))
      },
      markAllRead: () =>
        set(state => ({ notifications: state.notifications.map(n => ({ ...n, read: true })) })),
      clear: () => set({ notifications: [] }),
    }),
    { name: 'snapbite-notifications' }
  )
)

// ── Cart ──────────────────────────────────────────────────────────────────────

interface CartStore {
  count: number
  setCount: (n: number) => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      count: 0,
      setCount: (count) => set({ count }),
    }),
    { name: 'snapbite-cart' }
  )
)

// ── Driver GPS ────────────────────────────────────────────────────────────────

interface DriverStore {
  gpsActive: Record<string, boolean>
  setGpsActive: (orderId: string, value: boolean) => void
  clearGps: (orderId: string) => void
}

export const useDriverStore = create<DriverStore>()(
  persist(
    (set) => ({
      gpsActive: {},
      setGpsActive: (orderId, value) =>
        set(state => ({ gpsActive: { ...state.gpsActive, [orderId]: value } })),
      clearGps: (orderId) =>
        set(state => {
          const { [orderId]: _removed, ...rest } = state.gpsActive
          return { gpsActive: rest }
        }),
    }),
    { name: 'snapbite-driver' }
  )
)

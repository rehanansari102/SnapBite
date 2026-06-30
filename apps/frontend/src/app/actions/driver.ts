'use server'

import { getAccessToken } from '@/app/lib/cookies'
import {
  apiGetAvailableOrders,
  apiGetActiveDelivery,
  apiGetDriverHistory,
  apiAcceptOrder,
  apiUpdateOrderStatus,
  apiGetAvailableDrivers,
  apiAssignDriver,
  apiGetDriverAvailability,
  apiSetDriverAvailability,
  type OrderStatus,
} from '@/app/lib/api'

export async function getAvailableOrders() {
  const token = await getAccessToken()
  if (!token) return []
  return apiGetAvailableOrders(token)
}

export async function getActiveDelivery() {
  const token = await getAccessToken()
  if (!token) return null
  return apiGetActiveDelivery(token)
}

export async function getDriverHistory() {
  const token = await getAccessToken()
  if (!token) return []
  return apiGetDriverHistory(token)
}

export async function acceptOrder(orderId: string) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiAcceptOrder(token, orderId)
}

export async function updateDeliveryStatus(orderId: string, status: OrderStatus) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiUpdateOrderStatus(token, orderId, status)
}

export async function getAvailableDrivers() {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiGetAvailableDrivers(token)
}

export async function assignDriver(orderId: string, driverId: string, driverEmail: string) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiAssignDriver(token, orderId, driverId, driverEmail)
}

export async function getDriverAvailability() {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiGetDriverAvailability(token)
}

export async function setDriverAvailability(isAvailable: boolean) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiSetDriverAvailability(token, isAvailable)
}

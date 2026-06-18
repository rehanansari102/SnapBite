'use server'

import { getAccessToken } from '@/app/lib/cookies'
import {
  apiGetCart, apiAddToCart, apiUpdateCartItem, apiRemoveCartItem, apiClearCart,
  apiPlaceOrder, apiGetMyOrders, apiGetOrder, apiGetRestaurantOrders, apiUpdateOrderStatus,
  type DeliveryAddress, type OrderStatus,
} from '@/app/lib/api'

export async function getCart() {
  const token = await getAccessToken()
  if (!token) return null
  return apiGetCart(token)
}

export async function addToCart(payload: {
  menuItemId: string
  restaurantId: string
  restaurantName: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiAddToCart(token, payload)
}

export async function updateCartItem(menuItemId: string, quantity: number) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiUpdateCartItem(token, menuItemId, quantity)
}

export async function removeCartItem(menuItemId: string) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiRemoveCartItem(token, menuItemId)
}

export async function clearCart() {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiClearCart(token)
}

export async function placeOrder(deliveryAddress: DeliveryAddress, notes?: string) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiPlaceOrder(token, { deliveryAddress, notes })
}

export async function getMyOrders() {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiGetMyOrders(token)
}

export async function getOrder(orderId: string) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiGetOrder(token, orderId)
}

export async function getRestaurantOrders(restaurantId: string) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiGetRestaurantOrders(token, restaurantId)
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, cancelReason?: string) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiUpdateOrderStatus(token, orderId, status, cancelReason)
}

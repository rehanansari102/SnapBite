'use server'

import { revalidatePath } from 'next/cache'
import { apiGetAllRestaurants, apiGetNearbyRestaurants } from '@/app/lib/api'
import {
  apiCreateRestaurant,
  apiUpdateRestaurant,
  apiToggleRestaurant,
  apiSetOpeningHours,
  apiAddMenuItem,
  apiUpdateMenuItem,
  apiDeleteMenuItem,
  apiToggleMenuItem,
  type CreateRestaurantPayload,
  type CreateMenuItemPayload,
  type DayHours,
} from '@/app/lib/api'
import { getAccessToken } from '@/app/lib/cookies'

export type ActionState = { message?: string; success?: boolean; data?: unknown } | undefined

// ── Browse ────────────────────────────────────────────────────────────────────

export async function getAllRestaurants() {
  return apiGetAllRestaurants()
}

export async function getMyRestaurantsForNotifications() {
  const accessToken = await getAccessToken()
  if (!accessToken) return []
  try {
    return await apiGetMyRestaurants(accessToken)
  } catch {
    return []
  }
}

export async function getNearbyRestaurants(lat: number, lng: number, radius = 20) {
  return apiGetNearbyRestaurants(lat, lng, radius)
}

// ── Restaurant ────────────────────────────────────────────────────────────────

export async function createRestaurant(state: ActionState, formData: FormData): Promise<ActionState> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { message: 'Please log in first.' }

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const cuisineTypes = String(formData.get('cuisineTypes') ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const street = String(formData.get('street') ?? '').trim()
  const city = String(formData.get('city') ?? '').trim()
  const country = String(formData.get('country') ?? '').trim()
  const lat = parseFloat(String(formData.get('lat') ?? '0'))
  const lng = parseFloat(String(formData.get('lng') ?? '0'))
  const minimumOrder = parseFloat(String(formData.get('minimumOrder') ?? '0'))
  const deliveryFee = parseFloat(String(formData.get('deliveryFee') ?? '0'))
  const imageUrl = String(formData.get('imageUrl') ?? '').trim()

  if (!name) return { message: 'Restaurant name is required.' }
  if (!street || !city || !country) return { message: 'Full address is required.' }
  if (isNaN(lat) || isNaN(lng)) return { message: 'Valid coordinates are required.' }

  const payload: CreateRestaurantPayload = {
    name,
    ...(description && { description }),
    cuisineTypes,
    address: { street, city, country },
    lat,
    lng,
    ...(minimumOrder > 0 && { minimumOrder }),
    ...(deliveryFee > 0 && { deliveryFee }),
    ...(imageUrl && { imageUrl }),
  }

  try {
    const restaurant = await apiCreateRestaurant(accessToken, payload)
    revalidatePath('/dashboard/restaurants')
    return { success: true, data: restaurant }
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Failed to create restaurant.' }
  }
}

export async function updateRestaurant(restaurantId: string, payload: Partial<CreateRestaurantPayload & { isOpen: boolean }>): Promise<ActionState> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { message: 'Please log in first.' }

  try {
    const restaurant = await apiUpdateRestaurant(accessToken, restaurantId, payload)
    revalidatePath(`/dashboard/restaurants/${restaurantId}`)
    revalidatePath('/dashboard/restaurants')
    return { success: true, data: restaurant }
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Failed to update restaurant.' }
  }
}

export async function toggleRestaurant(restaurantId: string): Promise<ActionState> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { message: 'Please log in first.' }

  try {
    const result = await apiToggleRestaurant(accessToken, restaurantId)
    revalidatePath(`/dashboard/restaurants/${restaurantId}`)
    return { success: true, data: result }
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Failed to toggle status.' }
  }
}

export async function setOpeningHours(restaurantId: string, hours: DayHours[]): Promise<ActionState> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { message: 'Please log in first.' }

  try {
    await apiSetOpeningHours(accessToken, restaurantId, hours)
    revalidatePath(`/dashboard/restaurants/${restaurantId}`)
    return { success: true }
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Failed to save opening hours.' }
  }
}

// ── Menu ──────────────────────────────────────────────────────────────────────

export async function addMenuItem(restaurantId: string, state: ActionState, formData: FormData): Promise<ActionState> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { message: 'Please log in first.' }

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const price = parseFloat(String(formData.get('price') ?? '0'))
  const category = String(formData.get('category') ?? '').trim()
  const imageUrl = String(formData.get('imageUrl') ?? '').trim()

  if (!name) return { message: 'Item name is required.' }
  if (isNaN(price) || price < 0) return { message: 'Valid price is required.' }
  if (!category) return { message: 'Category is required.' }

  const payload: CreateMenuItemPayload = {
    name,
    ...(description && { description }),
    price,
    category,
    ...(imageUrl && { imageUrl }),
  }

  try {
    const item = await apiAddMenuItem(accessToken, restaurantId, payload)
    revalidatePath(`/dashboard/restaurants/${restaurantId}`)
    return { success: true, data: item }
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Failed to add item.' }
  }
}

export async function updateMenuItem(restaurantId: string, itemId: string, payload: Partial<CreateMenuItemPayload>): Promise<ActionState> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { message: 'Please log in first.' }

  try {
    const item = await apiUpdateMenuItem(accessToken, restaurantId, itemId, payload)
    revalidatePath(`/dashboard/restaurants/${restaurantId}`)
    return { success: true, data: item }
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Failed to update item.' }
  }
}

export async function deleteMenuItem(restaurantId: string, itemId: string): Promise<ActionState> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { message: 'Please log in first.' }

  try {
    await apiDeleteMenuItem(accessToken, restaurantId, itemId)
    revalidatePath(`/dashboard/restaurants/${restaurantId}`)
    return { success: true }
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Failed to delete item.' }
  }
}

export async function toggleMenuItem(restaurantId: string, itemId: string): Promise<ActionState> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { message: 'Please log in first.' }

  try {
    const result = await apiToggleMenuItem(accessToken, restaurantId, itemId)
    revalidatePath(`/dashboard/restaurants/${restaurantId}`)
    return { success: true, data: result }
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Failed to toggle item.' }
  }
}

import 'server-only'

const GATEWAY = process.env.API_GATEWAY_URL ?? 'http://localhost:3000'

export interface AuthUser {
  id: string
  email: string
  role: string
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

// Helper that forwards httpOnly cookies from the current request to the backend.
// Used so refresh calls carry the refresh_token cookie automatically.
async function gatewayFetch(
  path: string,
  options: RequestInit & { cookies?: string },
): Promise<Response> {
  const { cookies: cookieStr, headers: callerHeaders, ...rest } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(cookieStr ? { Cookie: cookieStr } : {}),
    // Forward any extra headers the caller provided (e.g. Authorization)
    ...(callerHeaders as Record<string, string> | undefined ?? {}),
  }
  try {
    return await fetch(`${GATEWAY}${path}`, { ...rest, headers })
  } catch {
    throw new Error('Unable to reach the server. Please try again later.')
  }
}

export async function apiRegister(email: string, password: string): Promise<AuthResult> {
  const res = await gatewayFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Registration failed')
  }
  return res.json()
}

export async function apiLogin(email: string, password: string): Promise<AuthResult> {
  const res = await gatewayFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Invalid credentials')
  }
  return res.json()
}

// Called with the current refresh_token cookie value so the backend can verify it.
export async function apiRefresh(refreshTokenCookie: string): Promise<AuthResult> {
  const res = await gatewayFetch('/api/auth/refresh', {
    method: 'POST',
    cookies: `refresh_token=${refreshTokenCookie}`,
  })
  if (!res.ok) throw new Error('Session expired')
  return res.json()
}

export async function apiLogout(accessToken: string, refreshTokenCookie: string): Promise<void> {
  await gatewayFetch('/api/auth/logout', {
    method: 'POST',
    cookies: `refresh_token=${refreshTokenCookie}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    } as never,
  })
}

export async function apiForgotPassword(email: string): Promise<void> {
  const res = await gatewayFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Request failed')
  }
}

export async function apiResetPassword(token: string, password: string): Promise<void> {
  const res = await gatewayFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Reset failed')
  }
}

export async function apiVerifyEmail(token: string): Promise<{ success: boolean; message: string; accessToken?: string; refreshToken?: string }> {
  const res = await gatewayFetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: 'GET',
  })
  const body = await res.json().catch(() => ({ success: false, message: 'Verification failed' }))
  return body
}

export async function apiResendVerification(accessToken: string): Promise<void> {
  const res = await gatewayFetch('/api/auth/resend-verification', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Failed to resend verification email')
  }
}

// ── Restaurant ────────────────────────────────────────────────────────────────

export interface RestaurantAddress {
  street: string
  city: string
  country: string
}

export interface DayHours {
  day: number
  open: string
  close: string
  isClosed: boolean
}

export interface Restaurant {
  _id: string
  name: string
  description?: string
  cuisineTypes: string[]
  address: RestaurantAddress
  imageUrl?: string
  isOpen: boolean
  isApproved: boolean
  minimumOrder: number
  deliveryFee: number
  openingHours: DayHours[]
  rating: number
  reviewCount: number
  ownerId: string
  createdAt: string
}

export interface CreateRestaurantPayload {
  name: string
  description?: string
  cuisineTypes?: string[]
  address: RestaurantAddress
  lat: number
  lng: number
  imageUrl?: string
  minimumOrder?: number
  deliveryFee?: number
}

export async function apiCreateRestaurant(accessToken: string, payload: CreateRestaurantPayload): Promise<Restaurant> {
  const res = await gatewayFetch('/api/restaurants', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Failed to create restaurant')
  }
  return res.json()
}

export async function apiGetMyRestaurants(accessToken: string): Promise<Restaurant[]> {
  const res = await gatewayFetch('/api/restaurants/my', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
  if (!res.ok) throw new Error('Failed to fetch your restaurants')
  return res.json()
}

export async function apiGetRestaurant(id: string): Promise<Restaurant> {
  const res = await gatewayFetch(`/api/restaurants/${id}`, { method: 'GET' })
  if (!res.ok) throw new Error('Restaurant not found')
  return res.json()
}

export async function apiGetAllRestaurants(): Promise<Restaurant[]> {
  const res = await gatewayFetch('/api/restaurants', { method: 'GET' })
  if (!res.ok) throw new Error('Failed to fetch restaurants')
  return res.json()
}

export async function apiGetNearbyRestaurants(lat: number, lng: number, radius?: number): Promise<Restaurant[]> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), ...(radius ? { radius: String(radius) } : {}) })
  const res = await gatewayFetch(`/api/restaurants/nearby?${params}`, { method: 'GET' })
  if (!res.ok) throw new Error('Failed to fetch restaurants')
  return res.json()
}

export async function apiUpdateRestaurant(accessToken: string, id: string, payload: Partial<CreateRestaurantPayload & { isOpen: boolean }>): Promise<Restaurant> {
  const res = await gatewayFetch(`/api/restaurants/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Failed to update restaurant')
  }
  return res.json()
}

export async function apiToggleRestaurant(accessToken: string, id: string): Promise<{ isOpen: boolean }> {
  const res = await gatewayFetch(`/api/restaurants/${id}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
  if (!res.ok) throw new Error('Failed to toggle restaurant status')
  return res.json()
}

export async function apiSetOpeningHours(accessToken: string, id: string, hours: DayHours[]): Promise<Restaurant> {
  const res = await gatewayFetch(`/api/restaurants/${id}/hours`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify({ hours }),
  })
  if (!res.ok) throw new Error('Failed to save opening hours')
  return res.json()
}

// ── Menu ──────────────────────────────────────────────────────────────────────

export interface MenuItem {
  _id: string
  restaurantId: string
  name: string
  description?: string
  price: number
  category: string
  imageUrl?: string
  isAvailable: boolean
}

export interface CreateMenuItemPayload {
  name: string
  description?: string
  price: number
  category: string
  imageUrl?: string
  isAvailable?: boolean
}

export async function apiGetMenu(restaurantId: string): Promise<MenuItem[]> {
  const res = await gatewayFetch(`/api/menus/${restaurantId}`, { method: 'GET' })
  if (!res.ok) throw new Error('Failed to fetch menu')
  return res.json()
}

export async function apiAddMenuItem(accessToken: string, restaurantId: string, payload: CreateMenuItemPayload): Promise<MenuItem> {
  const res = await gatewayFetch(`/api/menus/${restaurantId}/items`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Failed to add menu item')
  }
  return res.json()
}

export async function apiUpdateMenuItem(accessToken: string, restaurantId: string, itemId: string, payload: Partial<CreateMenuItemPayload>): Promise<MenuItem> {
  const res = await gatewayFetch(`/api/menus/${restaurantId}/items/${itemId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to update menu item')
  return res.json()
}

export async function apiDeleteMenuItem(accessToken: string, restaurantId: string, itemId: string): Promise<void> {
  const res = await gatewayFetch(`/api/menus/${restaurantId}/items/${itemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
  if (!res.ok) throw new Error('Failed to delete menu item')
}

export async function apiToggleMenuItem(accessToken: string, restaurantId: string, itemId: string): Promise<{ isAvailable: boolean }> {
  const res = await gatewayFetch(`/api/menus/${restaurantId}/items/${itemId}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
  if (!res.ok) throw new Error('Failed to toggle item availability')
  return res.json()
}

// ── User Profile ──────────────────────────────────────────────────────────────

export interface UserAddress {
  id: string
  label: string
  street: string
  city: string
  country: string
  lat: number
  lng: number
  isDefault: boolean
}

export interface UserProfile {
  userId: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string
  addresses: UserAddress[]
  savedRestaurantIds: string[]
}

export interface UpdateProfilePayload {
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string
}

export interface AddAddressPayload {
  label: string
  street: string
  city: string
  country: string
  lat: number
  lng: number
  isDefault?: boolean
}

export async function apiGetMe(accessToken: string): Promise<UserProfile> {
  const res = await gatewayFetch('/api/users/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

export async function apiUpdateProfile(accessToken: string, payload: UpdateProfilePayload): Promise<UserProfile> {
  const res = await gatewayFetch('/api/users/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Failed to update profile')
  }
  return res.json()
}

export async function apiAddAddress(accessToken: string, payload: AddAddressPayload): Promise<UserProfile> {
  const res = await gatewayFetch('/api/users/me/addresses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Failed to add address')
  }
  return res.json()
}

export async function apiRemoveAddress(accessToken: string, addressId: string): Promise<UserProfile> {
  const res = await gatewayFetch(`/api/users/me/addresses/${addressId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
  if (!res.ok) throw new Error('Failed to remove address')
  return res.json()
}

// ── Orders ────────────────────────────────────────────────────────────────────

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

export interface Cart {
  restaurantId: string
  restaurantName: string
  items: CartItem[]
  subtotal: number
}

export interface DeliveryAddress {
  street: string
  city: string
  country: string
  lat?: number
  lng?: number
}

export interface OrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED'

export interface Order {
  _id: string
  customerId: string
  restaurantId: string
  restaurantName: string
  items: OrderItem[]
  deliveryAddress: DeliveryAddress
  subtotal: number
  deliveryFee: number
  total: number
  status: OrderStatus
  notes?: string
  cancelReason?: string
  createdAt: string
  updatedAt: string
}

export async function apiGetCart(accessToken: string): Promise<Cart | null> {
  const res = await gatewayFetch('/api/orders/cart', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
  if (!res.ok) return null
  return res.json()
}

export async function apiAddToCart(accessToken: string, payload: {
  menuItemId: string
  restaurantId: string
  restaurantName: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}): Promise<Cart> {
  const res = await gatewayFetch('/api/orders/cart/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Failed to add to cart')
  }
  return res.json()
}

export async function apiUpdateCartItem(accessToken: string, menuItemId: string, quantity: number): Promise<Cart> {
  const res = await gatewayFetch(`/api/orders/cart/items/${menuItemId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify({ quantity }),
  })
  if (!res.ok) throw new Error('Failed to update cart item')
  return res.json()
}

export async function apiRemoveCartItem(accessToken: string, menuItemId: string): Promise<void> {
  await gatewayFetch(`/api/orders/cart/items/${menuItemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
}

export async function apiClearCart(accessToken: string): Promise<void> {
  await gatewayFetch('/api/orders/cart', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
}

export async function apiPlaceOrder(accessToken: string, payload: {
  deliveryAddress: DeliveryAddress
  notes?: string
}): Promise<Order> {
  const res = await gatewayFetch('/api/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Failed to place order')
  }
  return res.json()
}

export async function apiGetMyOrders(accessToken: string): Promise<Order[]> {
  const res = await gatewayFetch('/api/orders', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
  if (!res.ok) throw new Error('Failed to fetch orders')
  return res.json()
}

export async function apiGetOrder(accessToken: string, orderId: string): Promise<Order> {
  const res = await gatewayFetch(`/api/orders/${orderId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
  if (!res.ok) throw new Error('Order not found')
  return res.json()
}

export async function apiGetRestaurantOrders(accessToken: string, restaurantId: string): Promise<Order[]> {
  const res = await gatewayFetch(`/api/orders/restaurant/${restaurantId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
  })
  if (!res.ok) throw new Error('Failed to fetch restaurant orders')
  return res.json()
}

export async function apiUpdateOrderStatus(accessToken: string, orderId: string, status: OrderStatus, cancelReason?: string): Promise<Order> {
  const res = await gatewayFetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify({ status, cancelReason }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Failed to update order status')
  }
  return res.json()
}

// ── Media ─────────────────────────────────────────────────────────────────────

export type MediaFolder = 'avatars' | 'restaurants' | 'menus'

export interface PresignedUrlResult {
  uploadUrl: string
  publicUrl: string
  key: string
}

export async function apiGetPresignedUrl(
  accessToken: string,
  fileName: string,
  contentType: string,
  folder: MediaFolder,
): Promise<PresignedUrlResult> {
  const res = await gatewayFetch('/api/media/presigned-url', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` } as never,
    body: JSON.stringify({ fileName, contentType, folder }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Failed to get upload URL')
  }
  return res.json()
}

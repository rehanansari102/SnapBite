'use server'

export interface GooglePlace {
  _id: string          // place_id
  name: string
  address: { street: string; city: string; country: string }
  location: { lat: number; lng: number }
  rating: number
  reviewCount: number
  isOpen: boolean
  imageUrl?: string
  cuisineTypes: string[]
  priceLevel?: number  // 0-4
  minimumOrder: number
  deliveryFee: number
  isGooglePlace: true
  googlePlaceId: string
}

export async function getGoogleNearbyRestaurants(
  lat: number,
  lng: number,
  radius = 2000,
): Promise<GooglePlace[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) throw new Error('Google Places API key not configured')

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', String(radius))
  url.searchParams.set('type', 'restaurant')
  url.searchParams.set('key', key)

  const res = await fetch(url.toString(), { next: { revalidate: 300 } })
  if (!res.ok) throw new Error('Google Places request failed')

  const data = await res.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${data.status}`)
  }

  return (data.results ?? []).map((p: any): GooglePlace => {
    const photo = p.photos?.[0]?.photo_reference
    const imageUrl = photo
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${photo}&key=${key}`
      : undefined

    return {
      _id: p.place_id,
      name: p.name,
      address: {
        street: p.vicinity ?? '',
        city: extractCity(p.vicinity ?? ''),
        country: 'PK',
      },
      location: {
        lat: p.geometry.location.lat,
        lng: p.geometry.location.lng,
      },
      rating: p.rating ?? 0,
      reviewCount: p.user_ratings_total ?? 0,
      isOpen: p.opening_hours?.open_now ?? true,
      imageUrl,
      cuisineTypes: mapTypes(p.types ?? []),
      priceLevel: p.price_level,
      minimumOrder: 0,
      deliveryFee: 0,
      isGooglePlace: true,
      googlePlaceId: p.place_id,
    }
  })
}

function extractCity(vicinity: string): string {
  const parts = vicinity.split(',')
  return parts[parts.length - 1]?.trim() ?? vicinity
}

function mapTypes(types: string[]): string[] {
  const map: Record<string, string> = {
    restaurant: 'Restaurant',
    cafe: 'Café',
    bakery: 'Bakery',
    bar: 'Bar',
    meal_takeaway: 'Takeaway',
    meal_delivery: 'Delivery',
    fast_food: 'Fast Food',
    pizza_restaurant: 'Pizza',
    chinese_restaurant: 'Chinese',
    indian_restaurant: 'Indian',
    pakistani_restaurant: 'Pakistani',
  }
  return types
    .filter(t => map[t])
    .map(t => map[t])
    .slice(0, 3)
}

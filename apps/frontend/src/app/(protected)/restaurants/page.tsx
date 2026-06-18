import { cookies } from 'next/headers'
import RestaurantsClient from './RestaurantsClient'

export const metadata = { title: 'Restaurants — SnapBite' }

function decodeRole(token: string): string {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8')).role ?? ''
  } catch {
    return ''
  }
}

export default async function RestaurantsPage() {
  const token = (await cookies()).get('access_token')?.value ?? ''
  const role = decodeRole(token)
  const isOwner = role === 'restaurant_owner' || role === 'admin'

  return <RestaurantsClient isOwner={isOwner} />
}

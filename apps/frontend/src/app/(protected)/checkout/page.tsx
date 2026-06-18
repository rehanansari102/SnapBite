import { redirect } from 'next/navigation'
import { getCart } from '@/app/actions/order'
import { getAccessToken } from '@/app/lib/cookies'
import { apiGetMe } from '@/app/lib/api'
import CheckoutClient from './CheckoutClient'

export const metadata = { title: 'Checkout — SnapBite' }

export default async function CheckoutPage() {
  const token = await getAccessToken()
  if (!token) redirect('/login')

  const [cart, profile] = await Promise.all([
    getCart(),
    apiGetMe(token),
  ])

  if (!cart || cart.items.length === 0) redirect('/cart')

  return <CheckoutClient cart={cart} addresses={profile.addresses} />
}

import { getCart } from '@/app/actions/order'
import CartClient from './CartClient'

export const metadata = { title: 'Cart — SnapBite' }

export default async function CartPage() {
  const cart = await getCart()
  return <CartClient initialCart={cart} />
}

import AuthForm from '@/components/auth/AuthForm'
import { register } from '@/app/actions/auth'

export const metadata = { title: 'Sign up — SnapBite' }

export default function RegisterPage() {
  return <AuthForm mode="register" action={register} />
}

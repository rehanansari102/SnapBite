import AuthForm from '@/components/auth/AuthForm'
import { login } from '@/app/actions/auth'

export const metadata = { title: 'Log in — SnapBite' }

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  return (
    <>
      {/* Async searchParams — render inline banner via a wrapper */}
      <PasswordResetBanner searchParams={searchParams} />
      <AuthForm mode="login" action={login} />
    </>
  )
}

async function PasswordResetBanner({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  const params = await searchParams
  if (!params.reset) return null
  return (
    <div className="mb-4 rounded-2xl bg-green-50 border border-green-100 px-4 py-3 animate-fade-up">
      <p className="text-sm text-green-700 font-medium">
        ✓ Password updated! Log in with your new password.
      </p>
    </div>
  )
}

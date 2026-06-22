'use server'

import { redirect } from 'next/navigation'
import { apiLogin, apiLogout, apiRefresh, apiRegister, apiForgotPassword, apiResetPassword, apiVerifyEmail, apiResendVerification } from '@/app/lib/api'
import { clearAuthCookies, getAccessToken, getRefreshToken, setAuthCookies } from '@/app/lib/cookies'

export type AuthState = {
  errors?: { email?: string[]; password?: string[] }
  message?: string
} | undefined

// ── Register ─────────────────────────────────────────────────────────────────

export async function register(state: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '').trim()

  const errors: NonNullable<NonNullable<AuthState>['errors']> = {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ['Please enter a valid email address.']
  }
  if (!password || password.length < 8) {
    errors.password = ['Password must be at least 8 characters.']
  }
  if (Object.keys(errors).length) return { errors }

  try {
    const result = await apiRegister(email, password)
    // The backend sets refresh_token via Set-Cookie; we also persist
    // the access_token as an httpOnly cookie on the Next.js side.
    await setAuthCookies(result.accessToken, result.refreshToken)
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Registration failed' }
  }

  redirect('/dashboard')
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '').trim()

  const errors: NonNullable<NonNullable<AuthState>['errors']> = {}
  if (!email) errors.email = ['Email is required.']
  if (!password) errors.password = ['Password is required.']
  if (Object.keys(errors).length) return { errors }

  try {
    const result = await apiLogin(email, password)
    await setAuthCookies(result.accessToken, result.refreshToken)
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Login failed' }
  }

  redirect('/dashboard')
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout() {
  const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()])

  if (accessToken && refreshToken) {
    await apiLogout(accessToken, refreshToken).catch(() => {
      // Best-effort — clear local cookies regardless
    })
  }

  await clearAuthCookies()
  redirect('/login')
}

// ── Silent refresh (called from proxy.ts) ────────────────────────────────────

export async function silentRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return false

  try {
    const result = await apiRefresh(refreshToken)
    await setAuthCookies(result.accessToken, result.refreshToken)
    return true
  } catch {
    await clearAuthCookies()
    return false
  }
}

// ── Forgot password ───────────────────────────────────────────────────────────

export type SimpleState = { message?: string; success?: boolean } | undefined

export async function forgotPassword(state: SimpleState, formData: FormData): Promise<SimpleState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { message: 'Please enter a valid email address.' }
  }

  try {
    await apiForgotPassword(email)
  } catch {
    // Always show success to prevent email enumeration
  }

  return { success: true, message: 'If that email exists, a reset link has been sent. Check your inbox.' }
}

// ── Reset password ────────────────────────────────────────────────────────────

export async function resetPassword(state: SimpleState, formData: FormData): Promise<SimpleState> {
  const token = String(formData.get('token') ?? '').trim()
  const password = String(formData.get('password') ?? '').trim()
  const confirm = String(formData.get('confirm') ?? '').trim()

  if (!token) return { message: 'Reset token is missing. Please use the link from your email.' }
  if (password.length < 8) return { message: 'Password must be at least 8 characters.' }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { message: 'Password must contain uppercase, lowercase, and a number.' }
  }
  if (password !== confirm) return { message: 'Passwords do not match.' }

  try {
    await apiResetPassword(token, password)
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Reset failed. The link may have expired.' }
  }

  redirect('/login?reset=1')
}

// ── Email verification ────────────────────────────────────────────────────────

export async function verifyEmail(token: string): Promise<SimpleState> {
  if (!token) return { message: 'Verification token is missing.' }
  try {
    const result = await apiVerifyEmail(token)
    if (!result.success) return { message: result.message }
    if (result.accessToken && result.refreshToken) {
      await setAuthCookies(result.accessToken, result.refreshToken)
    }
    return { success: true, message: 'Email verified! You can now place orders.' }
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Verification failed.' }
  }
}

export async function resendVerification(): Promise<SimpleState> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { message: 'Please log in first.' }
  try {
    await apiResendVerification(accessToken)
    return { success: true, message: 'Verification email sent! Check your inbox.' }
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Failed to resend.' }
  }
}

// Returns the access token for WebSocket auth (avoids exposing cookie to client JS directly)
export async function getWsToken(): Promise<string | undefined> {
  return getAccessToken()
}

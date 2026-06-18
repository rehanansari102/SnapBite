'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { AuthState } from '@/app/actions/auth'

type Props = {
  mode: 'login' | 'register'
  action: (state: AuthState, formData: FormData) => Promise<AuthState>
}

export default function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined)

  const isRegister = mode === 'register'

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/80 p-8 md:p-10">
      {/* Header */}
      <div className="mb-8 animate-fade-up delay-100">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full inline-block" />
          {isRegister ? 'New account' : 'Welcome back'}
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
          {isRegister ? 'Create your account' : 'Log in to SnapBite'}
        </h1>
        <p className="text-sm text-gray-500">
          {isRegister
            ? 'Start ordering from the best restaurants near you.'
            : 'Good to see you again. Your favourites are waiting.'}
        </p>
      </div>

      {/* Error message */}
      {state?.message && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 animate-fade-up">
         <span className="text-red-500 mt-0.5 text-base leading-[14px]">⚠</span>
          <p className="text-sm text-red-700">{state.message}</p>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        {/* Email */}
        <div className="animate-fade-up delay-200">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-200"
          />
          {state?.errors?.email && (
            <p className="mt-1.5 text-xs text-red-600">{state.errors.email[0]}</p>
          )}
        </div>

        {/* Password */}
        <div className="animate-fade-up delay-300">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            {!isRegister && (
              <Link
                href="/forgot-password"
                className="text-xs text-orange-500 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            placeholder={isRegister ? 'At least 8 characters' : '••••••••'}
            required
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-200"
          />
          {state?.errors?.password && (
            <p className="mt-1.5 text-xs text-red-600">{state.errors.password[0]}</p>
          )}
        </div>

        {/* Submit */}
        <div className="animate-fade-up delay-400">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 text-sm shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all duration-200"
          >
            {pending
              ? 'Please wait…'
              : isRegister
              ? 'Create account →'
              : 'Log in →'}
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6 animate-fade-up delay-500">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Switch mode */}
      <p className="text-center text-sm text-gray-500 animate-fade-up delay-600">
        {isRegister ? (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600 hover:underline transition-colors">
              Log in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-orange-500 hover:text-orange-600 hover:underline transition-colors">
              Sign up free
            </Link>
          </>
        )}
      </p>
    </div>
  )
}

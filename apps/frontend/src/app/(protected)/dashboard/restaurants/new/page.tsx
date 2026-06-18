'use client'

import { useActionState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import Link from 'next/link'
import { createRestaurant } from '@/app/actions/restaurant'

function NewRestaurantForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [state, formAction, pending] = useActionState(createRestaurant, undefined)

  // Pre-fill values from query params (passed when registering a Google Place)
  const prefill = {
    name: params.get('name') ?? '',
    street: params.get('street') ?? '',
    city: params.get('city') ?? '',
    country: params.get('country') ?? 'PK',
    lat: params.get('lat') ?? '',
    lng: params.get('lng') ?? '',
    cuisineTypes: params.get('cuisineTypes') ?? '',
    imageUrl: params.get('imageUrl') ?? '',
  }
  const fromGoogle = params.get('source') === 'google'

  useEffect(() => {
    if (state?.success && state.data) {
      const r = state.data as { _id: string }
      router.push(`/dashboard/restaurants/${r._id}`)
    }
  }, [state, router])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/restaurants" className="text-sm text-gray-400 hover:text-orange-500 transition-colors">
          ← My Restaurants
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-2">
          {fromGoogle ? 'Register on SnapBite' : 'Create Restaurant'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {fromGoogle
            ? 'We pre-filled details from Google Maps. Review and complete the form.'
            : 'Fill in your restaurant details to get started.'}
        </p>
      </div>

      {fromGoogle && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
          <span className="text-blue-500 mt-0.5 text-lg">📍</span>
          <p className="text-sm text-blue-700">
            Details imported from Google Maps. Add your menu items after creating the restaurant.
          </p>
        </div>
      )}

      {state?.message && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
          <span className="text-red-500 mt-0.5">⚠</span>
          <p className="text-sm text-red-700">{state.message}</p>
        </div>
      )}

      <form action={formAction} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
        {/* Basic info */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Basic Info</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Restaurant Name *</label>
              <input name="name" required defaultValue={prefill.name} placeholder="e.g. The Burger Spot"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea name="description" rows={3} placeholder="Tell customers about your restaurant…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cuisine Types</label>
              <input name="cuisineTypes" defaultValue={prefill.cuisineTypes}
                placeholder="e.g. Burgers, American, Fast Food (comma separated)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cover Image URL</label>
              <input name="imageUrl" type="url" defaultValue={prefill.imageUrl} placeholder="https://…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Address */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Address</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Street *</label>
              <input name="street" required defaultValue={prefill.street} placeholder="123 Main St"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                <input name="city" required defaultValue={prefill.city} placeholder="Islamabad"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country *</label>
                <input name="country" required defaultValue={prefill.country} placeholder="PK"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude *</label>
                <input name="lat" required type="number" step="any" defaultValue={prefill.lat} placeholder="33.6844"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude *</label>
                <input name="lng" required type="number" step="any" defaultValue={prefill.lng} placeholder="73.0479"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Pricing */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Minimum Order (₨)</label>
              <input name="minimumOrder" type="number" min="0" step="1" defaultValue="0"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Fee (₨)</label>
              <input name="deliveryFee" type="number" min="0" step="1" defaultValue="0"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={pending}
          className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 text-sm shadow-lg shadow-orange-200 transition-all duration-200">
          {pending ? 'Creating…' : fromGoogle ? 'Register on SnapBite →' : 'Create Restaurant →'}
        </button>
      </form>
    </div>
  )
}

export default function NewRestaurantPage() {
  return (
    <Suspense>
      <NewRestaurantForm />
    </Suspense>
  )
}

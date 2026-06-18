import { cookies } from 'next/headers'
import Link from 'next/link'
import { apiGetMyRestaurants } from '@/app/lib/api'

export const metadata = { title: 'My Restaurants — SnapBite' }

export default async function MyRestaurantsPage() {
  const token = (await cookies()).get('access_token')?.value ?? ''
  let restaurants: Awaited<ReturnType<typeof apiGetMyRestaurants>> = []
  let error = ''

  try {
    restaurants = await apiGetMyRestaurants(token)
  } catch {
    error = 'Could not load your restaurants.'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">My Restaurants</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your restaurants and menus</p>
        </div>
        <Link
          href="/dashboard/restaurants/new"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 text-sm shadow-lg shadow-orange-200 transition-all duration-200"
        >
          + New Restaurant
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {restaurants.length === 0 && !error ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <div className="text-5xl mb-4">🍽️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No restaurants yet</h2>
          <p className="text-sm text-gray-500 mb-6">Create your first restaurant to start taking orders.</p>
          <Link
            href="/dashboard/restaurants/new"
            className="inline-block rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 text-sm shadow-lg shadow-orange-200 transition-all"
          >
            Create Restaurant →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {restaurants.map((r) => (
            <Link
              key={r._id}
              href={`/dashboard/restaurants/${r._id}`}
              className="bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
            >
              {r.imageUrl ? (
                <img src={r.imageUrl} alt={r.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-orange-50 flex items-center justify-center">
                  <span className="text-4xl">🍔</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{r.name}</h2>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${r.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{r.address?.city}, {r.address?.country}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span>⭐ {r.rating.toFixed(1)} ({r.reviewCount})</span>
                  <span>•</span>
                  <span>Min. ${r.minimumOrder}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

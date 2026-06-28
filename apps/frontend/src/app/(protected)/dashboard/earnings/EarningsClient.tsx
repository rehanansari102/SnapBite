'use client'

import { useState, useEffect, useCallback } from 'react'
import { getRestaurantEarnings } from '@/app/actions/order'
import type { EarningsData } from '@/app/lib/api'

type Restaurant = { _id: string; name: string }

function fmt(n: number) {
  return `₨${Math.round(n).toLocaleString()}`
}

function shortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── SVG Bar Chart ────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
  const W = 600
  const H = 160
  const BAR_GAP = 4
  const barW = (W - (data.length - 1) * BAR_GAP) / data.length

  return (
    <div className="relative select-none">
      <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const x = i * (barW + BAR_GAP)
          const barH = (d.revenue / maxRevenue) * H
          const y = H - barH
          const isHov = hovered === i
          return (
            <g key={d.date}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer">
              {/* background track */}
              <rect x={x} y={0} width={barW} height={H} rx={4} fill="transparent" />
              {/* bar */}
              <rect
                x={x} y={y} width={barW} height={barH || 3} rx={4}
                fill={isHov ? '#ea580c' : d.revenue > 0 ? '#fb923c' : '#f3f4f6'}
                style={{ transition: 'fill 0.15s' }}
              />
              {/* date label */}
              {(i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) && (
                <text
                  x={x + barW / 2} y={H + 20}
                  textAnchor="middle" fontSize={9} fill="#9ca3af"
                  className="font-mono">
                  {shortDate(d.date)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && (
        <div
          className="absolute top-0 pointer-events-none bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl whitespace-nowrap z-10"
          style={{
            left: `${(hovered / data.length) * 100}%`,
            transform: hovered > data.length / 2 ? 'translateX(-100%)' : 'translateX(8px)',
          }}>
          <p className="font-bold">{shortDate(data[hovered].date)}</p>
          <p>{fmt(data[hovered].revenue)}</p>
          <p className="text-gray-400">{data[hovered].orders} order{data[hovered].orders !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  )
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, gradient, icon,
}: {
  label: string
  value: string
  sub?: string
  gradient: string
  icon: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-lg ${gradient}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black mt-1">{value}</p>
          {sub && <p className="text-xs text-white/60 mt-0.5">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function EarningsClient({ restaurants }: { restaurants: Restaurant[] }) {
  const [selectedId, setSelectedId] = useState<string>(restaurants[0]?._id ?? '')
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const result = await getRestaurantEarnings(id)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load earnings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(selectedId)
  }, [selectedId, load])

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <span className="text-5xl">🏪</span>
        <p className="font-bold text-gray-900 dark:text-white">No restaurants yet</p>
        <p className="text-sm text-gray-500">Create a restaurant to start tracking earnings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Restaurant selector */}
      {restaurants.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {restaurants.map(r => (
            <button key={r._id}
              onClick={() => setSelectedId(r._id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedId === r._id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
              }`}>
              {r.name}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading earnings…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl px-5 py-4 text-sm">{error}</div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Your Earnings"
              value={fmt(data.totalRevenue)}
              sub={`${data.deliveredCount} delivered`}
              gradient="bg-gradient-to-br from-orange-500 to-orange-400"
              icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
            <StatCard
              label="Card Payments"
              value={fmt(data.cardRevenue)}
              sub="Stripe paid"
              gradient="bg-gradient-to-br from-blue-500 to-blue-400"
              icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>}
            />
            <StatCard
              label="Cash (COD)"
              value={fmt(data.codRevenue)}
              sub="On delivery"
              gradient="bg-gradient-to-br from-green-500 to-green-400"
              icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>}
            />
            <StatCard
              label="Platform Fee (10%)"
              value={fmt(data.totalPlatformFees ?? 0)}
              sub="SnapBite commission"
              gradient="bg-gradient-to-br from-red-400 to-red-500"
              icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 2.5 2 2.5-2 2.5 2 2.5-2L19 21z"/></svg>}
            />
          </div>

          {/* Chart + Top Items */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Bar Chart — last 14 days */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Daily Revenue</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Last 14 days · hover bars for details</p>
                </div>
                <span className="text-xs bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300 font-semibold px-2.5 py-1 rounded-full">
                  {fmt(data.daily.reduce((s, d) => s + d.revenue, 0))}
                </span>
              </div>
              {data.daily.every(d => d.revenue === 0) ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                  <span className="text-4xl mb-2">📊</span>
                  <p className="text-sm">No revenue in the last 14 days yet</p>
                </div>
              ) : (
                <BarChart data={data.daily} />
              )}
            </div>

            {/* Top Items */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">Top Sellers</h2>
              {data.topItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-300 text-sm">
                  No sales data yet
                </div>
              ) : (
                <ol className="space-y-3">
                  {data.topItems.map((item, i) => (
                    <li key={item.name} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        i === 0 ? 'bg-yellow-100 text-yellow-600'
                        : i === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        : 'bg-orange-50 text-orange-400'
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.quantity} sold · {fmt(item.revenue)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Order counts summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Order Summary</h2>
            <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700">
              {[
                { label: 'Total Orders', value: data.totalOrders, color: 'text-gray-900 dark:text-white' },
                { label: 'Delivered', value: data.deliveredCount, color: 'text-green-600' },
                { label: 'Active', value: data.pendingCount, color: 'text-orange-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center px-4">
                  <p className={`text-3xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import type { AdminAnalytics } from '@/app/lib/api'

function fmt(n: number) {
  return `₨${Math.round(n).toLocaleString()}`
}

function shortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, gradient, icon,
}: { label: string; value: string; sub: string; gradient: string; icon: React.ReactNode }) {
  return (
    <div className={`${gradient} rounded-2xl p-5 text-white shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black mt-3 tracking-tight">{value}</p>
      <p className="text-sm font-bold mt-0.5 opacity-90">{label}</p>
      <p className="text-xs mt-0.5 opacity-70">{sub}</p>
    </div>
  )
}

// ── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ data, field, color }: {
  data: { date: string; revenue: number; orders: number; fees: number }[]
  field: 'revenue' | 'fees' | 'orders'
  color: string
}) {
  const values = data.map(d => d[field])
  const max = Math.max(...values, 1)
  const W = 700
  const H = 120
  const GAP = 3
  const barW = (W - (data.length - 1) * GAP) / data.length

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const val = d[field]
        const barH = (val / max) * H
        const x = i * (barW + GAP)
        const y = H - barH
        const isEdge = i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barW} height={barH || 2} rx={2} fill={val > 0 ? color : '#f3f4f6'} />
            {isEdge && (
              <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize={8} fill="#9ca3af" className="font-mono">
                {shortDate(d.date)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Status pill ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-600',
  PENDING:    'bg-amber-100 text-amber-600',
  CONFIRMED:  'bg-blue-100 text-blue-600',
  PREPARING:  'bg-orange-100 text-orange-600',
  READY:      'bg-purple-100 text-purple-700',
  PICKED_UP:  'bg-indigo-100 text-indigo-700',
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function AnalyticsClient({ data }: { data: AdminAnalytics | null }) {
  if (!data) {
    return <div className="py-20 text-center text-sm text-gray-400">Failed to load analytics data.</div>
  }

  const totalActiveOrders = Object.entries(data.byStatus)
    .filter(([s]) => !['DELIVERED', 'CANCELLED'].includes(s))
    .reduce((sum, [, n]) => sum + n, 0)

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Gross Revenue"
          value={fmt(data.totalGrossRevenue)}
          sub="Total customer payments"
          gradient="bg-gradient-to-br from-orange-500 to-orange-400"
          icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <StatCard
          label="Platform Fees"
          value={fmt(data.totalPlatformFees)}
          sub="SnapBite commission collected"
          gradient="bg-gradient-to-br from-violet-500 to-violet-400"
          icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 2.5 2 2.5-2 2.5 2 2.5-2L19 21z"/></svg>}
        />
        <StatCard
          label="Restaurant Payouts"
          value={fmt(data.totalRestaurantPayouts)}
          sub="Earnings after commission"
          gradient="bg-gradient-to-br from-green-500 to-green-400"
          icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>}
        />
        <StatCard
          label="Total Orders"
          value={data.totalOrders.toLocaleString()}
          sub={`${totalActiveOrders} active now`}
          gradient="bg-gradient-to-br from-blue-500 to-blue-400"
          icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-extrabold text-gray-800">Daily Revenue</p>
              <p className="text-xs text-gray-400 mt-0.5">Last 30 days · gross</p>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
              {fmt(data.daily.reduce((s, d) => s + d.revenue, 0))}
            </span>
          </div>
          <BarChart data={data.daily} field="revenue" color="#fb923c" />
        </div>

        {/* Fee chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-extrabold text-gray-800">Daily Platform Fees</p>
              <p className="text-xs text-gray-400 mt-0.5">Last 30 days · commission</p>
            </div>
            <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">
              {fmt(data.daily.reduce((s, d) => s + d.fees, 0))}
            </span>
          </div>
          <BarChart data={data.daily} field="fees" color="#7c3aed" />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top restaurants */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700">
            <p className="text-sm font-extrabold text-gray-800">Top Restaurants by Revenue</p>
            <p className="text-xs text-gray-400 mt-0.5">Gross revenue · all time</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {data.topRestaurants.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-400">No data yet</p>
            )}
            {data.topRestaurants.map((r, i) => (
              <div key={r.restaurantId} className="flex items-center gap-4 px-5 py-3.5">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                  i === 0 ? 'bg-amber-100 text-amber-600' :
                  i === 1 ? 'bg-gray-100 text-gray-500' :
                  i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.orders} orders · {fmt(r.fees)} commission</p>
                </div>
                <p className="text-sm font-extrabold text-gray-900 flex-shrink-0">{fmt(r.revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Order status breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700">
            <p className="text-sm font-extrabold text-gray-800">Orders by Status</p>
            <p className="text-xs text-gray-400 mt-0.5">All time breakdown</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {Object.entries(data.byStatus)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between px-5 py-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </span>
                  <span className="text-sm font-extrabold text-gray-900">{count.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

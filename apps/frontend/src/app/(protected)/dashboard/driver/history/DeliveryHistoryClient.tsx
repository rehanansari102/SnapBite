'use client'

import type { Order } from '@/app/lib/api'

export default function DeliveryHistoryClient({ deliveries }: { deliveries: Order[] }) {
  const today = new Date().toDateString()
  const todayCount = deliveries.filter(d => new Date(d.createdAt).toDateString() === today).length
  const totalValue = deliveries.reduce((s, d) => s + d.total, 0)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Delivery History</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your completed deliveries</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total deliveries', value: deliveries.length, icon: '🛵', color: 'from-blue-50 to-blue-100/50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
          { label: 'Today', value: todayCount, icon: '📅', color: 'from-orange-50 to-orange-100/50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
          { label: 'Total orders value', value: `₨${totalValue.toFixed(0)}`, icon: '💰', color: 'from-green-50 to-green-100/50', text: 'text-green-600', iconBg: 'bg-green-100' },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 border border-white`}>
            <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center text-lg mb-2`}>
              {card.icon}
            </div>
            <p className="text-xl font-black text-gray-900">{card.value}</p>
            <p className={`text-xs font-semibold ${card.text} mt-0.5`}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {deliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-3xl">
            📋
          </div>
          <p className="font-bold text-gray-700 dark:text-gray-300">No deliveries yet</p>
          <p className="text-sm text-gray-400">Your completed deliveries will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map(delivery => (
            <div key={delivery._id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-xl flex-shrink-0">
                ✅
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-gray-900 dark:text-white truncate">{delivery.restaurantName}</p>
                <p className="text-sm text-gray-400 truncate">
                  {delivery.deliveryAddress.street}, {delivery.deliveryAddress.city}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(delivery.createdAt).toLocaleDateString('en-PK', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-gray-900 dark:text-white">₨{delivery.total.toFixed(0)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{delivery.items.reduce((s, i) => s + i.quantity, 0)} items</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

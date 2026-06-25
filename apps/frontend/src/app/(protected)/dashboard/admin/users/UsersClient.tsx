'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { banUser } from '@/app/actions/auth'
import type { AdminUsersResult, AdminUser } from '@/app/lib/api'

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin:              { label: 'Admin',   cls: 'bg-violet-100 text-violet-700' },
  restaurant_owner:   { label: 'Owner',   cls: 'bg-orange-100 text-orange-700' },
  customer:           { label: 'Customer',cls: 'bg-gray-100 text-gray-600' },
  driver:             { label: 'Driver',  cls: 'bg-blue-100 text-blue-700' },
}

function UserRow({ user, onToggleBan }: { user: AdminUser; onToggleBan: (id: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const badge = ROLE_BADGE[user.role] ?? { label: user.role, cls: 'bg-gray-100 text-gray-600' }

  function handleBan() {
    setLoading(true)
    startTransition(async () => {
      await banUser(user.id)
      onToggleBan(user.id)
      setLoading(false)
    })
  }

  return (
    <div className={`flex items-center gap-4 px-5 py-4 border-t border-gray-50 ${!user.isActive ? 'opacity-60' : ''}`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${user.isActive ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
        {user.email[0].toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-extrabold text-gray-900 truncate">{user.email}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          {!user.isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Banned</span>}
          {!user.isEmailVerified && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">Unverified</span>}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Joined {new Date(user.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
          {user.businessName && ` · ${user.businessName}`}
        </p>
      </div>

      {/* Ban/unban — can't act on admins */}
      {user.role !== 'admin' && (
        <button
          onClick={handleBan}
          disabled={isPending || loading}
          className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 ${
            user.isActive
              ? 'text-red-600 bg-red-50 hover:bg-red-100'
              : 'text-green-600 bg-green-50 hover:bg-green-100'
          }`}
        >
          {loading ? '…' : user.isActive ? 'Ban' : 'Unban'}
        </button>
      )}
    </div>
  )
}

export default function UsersClient({ initialResult }: { initialResult: AdminUsersResult | null }) {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>(initialResult?.users ?? [])
  const [search, setSearch] = useState('')

  function handleToggleBan(id: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u))
  }

  const filtered = search.trim()
    ? users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || u.businessName?.toLowerCase().includes(search.toLowerCase()))
    : users

  if (!initialResult) {
    return <div className="text-center py-20 text-sm text-gray-500">Failed to load users.</div>
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or business name…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            {search ? `${filtered.length} of ${users.length}` : `${users.length}`} users
          </p>
          <p className="text-xs text-gray-400">{initialResult.pages} page{initialResult.pages !== 1 ? 's' : ''} total</p>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No users match your search.</div>
        ) : (
          filtered.map(user => (
            <UserRow key={user.id} user={user} onToggleBan={handleToggleBan} />
          ))
        )}
      </div>

      {/* Pagination */}
      {initialResult.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: initialResult.pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => router.push(`/dashboard/admin/users?page=${p}`)}
              className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                p === initialResult.page
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { createPromo, deactivatePromo } from '@/app/actions/order'
import type { PromoCode } from '@/app/lib/api'

function fmt(n: number) { return `₨${Math.round(n).toLocaleString()}` }

function PromoRow({ promo, onDeactivate }: { promo: PromoCode; onDeactivate: (id: string) => void }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className={`flex items-center gap-4 px-5 py-4 border-t border-gray-50 ${!promo.isActive ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-black text-gray-900 text-sm">{promo.code}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            promo.type === 'PERCENT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          }`}>
            {promo.type === 'PERCENT' ? `${promo.value}% OFF` : `${fmt(promo.value)} OFF`}
          </span>
          {!promo.isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {promo.usedCount} uses{promo.maxUses ? ` / ${promo.maxUses} max` : ' (unlimited)'}
          {promo.minOrderValue > 0 ? ` · min order ${fmt(promo.minOrderValue)}` : ''}
          {promo.expiresAt ? ` · expires ${new Date(promo.expiresAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          {promo.description ? ` · ${promo.description}` : ''}
        </p>
      </div>
      {promo.isActive && (
        <button
          disabled={isPending}
          onClick={() => startTransition(async () => { await deactivatePromo(promo._id); onDeactivate(promo._id) })}
          className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {isPending ? '…' : 'Deactivate'}
        </button>
      )}
    </div>
  )
}

const EMPTY_FORM = { code: '', type: 'PERCENT' as 'PERCENT' | 'FLAT', value: '', minOrderValue: '', maxUses: '', expiresAt: '', description: '' }

export default function PromosClient({ initialPromos }: { initialPromos: PromoCode[] }) {
  const [promos, setPromos] = useState<PromoCode[]>(initialPromos)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  function set(key: keyof typeof EMPTY_FORM, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  async function handleCreate() {
    if (!form.code.trim() || !form.value) { setError('Code and value are required'); return }
    setCreating(true); setError('')
    try {
      const created = await createPromo({
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
        description: form.description || undefined,
      })
      setPromos(p => [created, ...p])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create promo code')
    } finally {
      setCreating(false)
    }
  }

  function handleDeactivate(id: string) {
    setPromos(p => p.map(x => x._id === id ? { ...x, isActive: false } : x))
  }

  const active   = promos.filter(p => p.isActive)
  const inactive = promos.filter(p => !p.isActive)

  return (
    <div className="space-y-4">
      {/* Create button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md shadow-orange-200/60 hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4v16m8-8H4"/></svg>
          {showForm ? 'Cancel' : 'New Promo Code'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5 space-y-4">
          <p className="font-extrabold text-gray-900 text-sm">New Promo Code</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Code *</label>
              <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
                placeholder="SAVE20"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono uppercase focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value as 'PERCENT' | 'FLAT')}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 bg-white">
                <option value="PERCENT">Percent (%)</option>
                <option value="FLAT">Flat (₨)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Value * ({form.type === 'PERCENT' ? '%' : '₨'})
              </label>
              <input type="number" value={form.value} onChange={e => set('value', e.target.value)}
                placeholder={form.type === 'PERCENT' ? '10' : '150'}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Min Order (₨)</label>
              <input type="number" value={form.minOrderValue} onChange={e => set('minOrderValue', e.target.value)}
                placeholder="0 = no minimum"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Max Uses</label>
              <input type="number" value={form.maxUses} onChange={e => set('maxUses', e.target.value)}
                placeholder="Leave blank = unlimited"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Expires At</label>
              <input type="date" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Description (optional)</label>
              <input value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="e.g. Weekend special"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400" />
            </div>
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <button onClick={handleCreate} disabled={creating}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors">
            {creating ? 'Creating…' : 'Create Promo Code'}
          </button>
        </div>
      )}

      {/* Active promos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{active.length} Active</p>
        </div>
        {active.length === 0
          ? <p className="py-10 text-center text-sm text-gray-400">No active promo codes.</p>
          : active.map(p => <PromoRow key={p._id} promo={p} onDeactivate={handleDeactivate} />)}
      </div>

      {/* Inactive promos */}
      {inactive.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{inactive.length} Inactive</p>
          </div>
          {inactive.map(p => <PromoRow key={p._id} promo={p} onDeactivate={handleDeactivate} />)}
        </div>
      )}
    </div>
  )
}

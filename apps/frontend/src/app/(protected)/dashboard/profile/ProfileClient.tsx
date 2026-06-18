'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { updateProfile, addAddress, removeAddress } from '@/app/actions/profile'
import type { UserProfile, UserAddress } from '@/app/lib/api'
import AvatarUpload from '@/components/profile/AvatarUpload'

interface Props {
  profile: UserProfile | null
}

export default function ProfileClient({ profile }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [addAddrOpen, setAddAddrOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null)

  const [profileState, profileAction] = useActionState(updateProfile, {})
  const [addrState, addrAction] = useActionState(addAddress, {})
  const [formKey, setFormKey] = useState(0)

  // Close edit form and re-mount inputs with fresh default values after successful save
  useEffect(() => {
    if (profileState.success) {
      setEditOpen(false)
      setFormKey(k => k + 1)
      setPendingAvatarUrl(null)
    }
  }, [profileState.success])

  // Close add-address form after successful save
  useEffect(() => {
    if (addrState.success) {
      setAddAddrOpen(false)
    }
  }, [addrState.success])

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.email || '—'

  function handleRemove(addressId: string) {
    setRemovingId(addressId)
    startTransition(async () => {
      await removeAddress(addressId)
      setRemovingId(null)
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Profile card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-5">
          {/* Always-visible avatar — click to upload instantly */}
          <AvatarUpload
            email={profile?.email ?? ''}
            currentUrl={pendingAvatarUrl ?? profile?.avatarUrl}
            onUploaded={url => {
              setPendingAvatarUrl(url)
              setEditOpen(true)
            }}
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{displayName}</h2>
            <p className="text-sm text-gray-500 truncate">{profile?.email}</p>
            {profile?.phone && (
              <p className="text-sm text-gray-400 mt-0.5">📞 {profile.phone}</p>
            )}
          </div>
          <button
            onClick={() => setEditOpen(v => !v)}
            className="shrink-0 px-4 py-2 rounded-xl bg-orange-50 text-orange-600 text-sm font-semibold hover:bg-orange-100 transition-colors"
          >
            {editOpen ? 'Cancel' : '✏️ Edit'}
          </button>
        </div>

        {/* Edit form */}
        {editOpen && (
          <form key={formKey} action={profileAction} className="mt-6 border-t border-gray-100 pt-5 space-y-4 animate-fade-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">First name</label>
                <input
                  name="firstName"
                  defaultValue={profile?.firstName ?? ''}
                  placeholder="John"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Last name</label>
                <input
                  name="lastName"
                  defaultValue={profile?.lastName ?? ''}
                  placeholder="Doe"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Phone number</label>
              <input
                name="phone"
                defaultValue={profile?.phone ?? ''}
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            {/* Hidden input carries the R2 public URL after upload */}
            {pendingAvatarUrl && (
              <input type="hidden" name="avatarUrl" value={pendingAvatarUrl} />
            )}
            {pendingAvatarUrl && (
              <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-xl">
                ✅ New photo ready — save to apply
              </p>
            )}

            {profileState.error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{profileState.error}</p>
            )}
            {profileState.success && (
              <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-xl">✅ Profile updated!</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              Save changes
            </button>
          </form>
        )}
      </div>

      {/* ── Account info strip ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        <InfoRow icon="📧" label="Email" value={profile?.email ?? '—'} />
        <InfoRow
          icon="📛"
          label="Full name"
          value={[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || '—'}
        />
        <InfoRow icon="📞" label="Phone" value={profile?.phone || '—'} />
      </div>

      {/* ── Saved addresses ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Saved Addresses</h3>
            <p className="text-xs text-gray-400 mt-0.5">{profile?.addresses.length ?? 0} address(es)</p>
          </div>
          <button
            onClick={() => setAddAddrOpen(v => !v)}
            className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 text-sm font-semibold hover:bg-orange-100 transition-colors"
          >
            {addAddrOpen ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {/* Address list */}
        <div className="space-y-2">
          {(profile?.addresses ?? []).length === 0 && !addAddrOpen && (
            <p className="text-sm text-gray-400 text-center py-4">No saved addresses yet.</p>
          )}
          {(profile?.addresses ?? []).map((addr: UserAddress) => (
            <AddressCard
              key={addr.id}
              addr={addr}
              removing={removingId === addr.id}
              onRemove={() => handleRemove(addr.id)}
              isPending={isPending}
            />
          ))}
        </div>

        {/* Add address form */}
        {addAddrOpen && (
          <form action={addrAction} className="mt-4 border-t border-gray-100 pt-4 space-y-3 animate-fade-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Label</label>
                <input
                  name="label"
                  required
                  placeholder="Home / Work / Other"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Country</label>
                <input
                  name="country"
                  required
                  placeholder="United States"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Street</label>
              <input
                name="street"
                required
                placeholder="123 Main St"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">City</label>
              <input
                name="city"
                required
                placeholder="New York"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Latitude</label>
                <input
                  name="lat"
                  type="number"
                  step="any"
                  placeholder="40.7128"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Longitude</label>
                <input
                  name="lng"
                  type="number"
                  step="any"
                  placeholder="-74.0060"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isDefault"
                value="true"
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-300"
              />
              <span className="text-sm text-gray-600">Set as default address</span>
            </label>

            {addrState.error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{addrState.error}</p>
            )}
            {addrState.success && (
              <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-xl">✅ Address saved!</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors"
            >
              Save address
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="text-base w-5 text-center">{icon}</span>
      <span className="text-xs font-semibold text-gray-400 w-20">{label}</span>
      <span className="text-sm text-gray-700 flex-1 truncate">{value}</span>
    </div>
  )
}

function AddressCard({
  addr,
  removing,
  onRemove,
  isPending,
}: {
  addr: UserAddress
  removing: boolean
  onRemove: () => void
  isPending: boolean
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
      <span className="text-xl mt-0.5">📍</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-orange-500 uppercase tracking-wide">{addr.label}</span>
          {addr.isDefault && (
            <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">default</span>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-0.5 truncate">{addr.street}, {addr.city}</p>
        <p className="text-xs text-gray-400">{addr.country}</p>
      </div>
      <button
        onClick={onRemove}
        disabled={isPending || removing}
        className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors disabled:opacity-40 shrink-0 mt-0.5"
      >
        {removing ? '…' : 'Remove'}
      </button>
    </div>
  )
}

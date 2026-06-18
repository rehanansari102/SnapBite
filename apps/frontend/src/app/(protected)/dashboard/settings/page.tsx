'use client'

import { useState } from 'react'

interface ToggleProps {
  label: string
  description: string
  defaultChecked?: boolean
}

function Toggle({ label, description, defaultChecked = false }: ToggleProps) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked(v => !v)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-300 ${
          checked ? 'bg-orange-500' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</h2>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your preferences and notifications</p>
      </div>

      {/* Notifications */}
      <Section title="Notifications">
        <Toggle
          label="Order updates"
          description="Get notified when your order status changes"
          defaultChecked
        />
        <Toggle
          label="Promotions & offers"
          description="Receive emails about deals and discounts"
        />
        <Toggle
          label="New restaurants nearby"
          description="Be the first to know when new restaurants join"
        />
        <Toggle
          label="Weekly digest"
          description="A weekly summary of your orders and activity"
        />
      </Section>

      {/* Privacy */}
      <Section title="Privacy">
        <Toggle
          label="Share order history"
          description="Allow SnapBite to use your order history to personalise recommendations"
          defaultChecked
        />
        <Toggle
          label="Location tracking"
          description="Allow precise location for faster delivery"
          defaultChecked
        />
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <Toggle
          label="Compact sidebar"
          description="Show only icons in the sidebar on desktop (coming soon)"
        />
      </Section>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Delete account</p>
            <p className="text-xs text-gray-400 mt-0.5">Permanently remove your account and all data</p>
          </div>
          <button
            className="px-4 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
            onClick={() => alert('Please contact support to delete your account.')}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

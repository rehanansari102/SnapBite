import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiGetMe } from '@/app/lib/api'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const token = (await cookies()).get('access_token')?.value
  if (!token) redirect('/login')

  const profile = await apiGetMe(token).catch((e: unknown) => {
    console.error('[profile] apiGetMe failed:', e)
    return null
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your personal info and saved addresses</p>
      </div>
      <ProfileClient profile={profile} />
    </div>
  )
}

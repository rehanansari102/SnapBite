import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAllUsers } from '@/app/actions/auth'
import UsersClient from './UsersClient'

export const metadata = { title: 'User Management — SnapBite Admin' }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const token = (await cookies()).get('access_token')?.value ?? ''
  let role = ''
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'))
    role = String(payload.role ?? '')
  } catch { /* ignore */ }

  if (role !== 'admin') redirect('/dashboard')

  const { page } = await searchParams
  const result = await getAllUsers(page ? Number(page) : 1)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">User Management</h1>
          <p className="text-sm text-gray-400 mt-1">
            {result ? `${result.total} total users` : 'Manage user accounts and access'}
          </p>
        </div>
      </div>
      <UsersClient initialResult={result} />
    </div>
  )
}

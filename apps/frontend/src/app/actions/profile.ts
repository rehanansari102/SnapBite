'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import {
  apiUpdateProfile,
  apiAddAddress,
  apiRemoveAddress,
  apiGetPresignedUrl,
  UpdateProfilePayload,
  AddAddressPayload,
  MediaFolder,
  PresignedUrlResult,
} from '@/app/lib/api'

export async function updateProfile(
  _state: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const token = (await cookies()).get('access_token')?.value
  if (!token) return { error: 'Not authenticated' }

  const payload: UpdateProfilePayload = {}
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const phone = formData.get('phone') as string
  const avatarUrl = formData.get('avatarUrl') as string

  if (firstName) payload.firstName = firstName
  if (lastName) payload.lastName = lastName
  if (phone) payload.phone = phone
  if (avatarUrl) payload.avatarUrl = avatarUrl

  try {
    await apiUpdateProfile(token, payload)
    revalidatePath('/dashboard/profile')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Update failed' }
  }
}

export async function addAddress(
  _state: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const token = (await cookies()).get('access_token')?.value
  if (!token) return { error: 'Not authenticated' }

  const payload: AddAddressPayload = {
    label: formData.get('label') as string,
    street: formData.get('street') as string,
    city: formData.get('city') as string,
    country: formData.get('country') as string,
    lat: parseFloat(formData.get('lat') as string) || 0,
    lng: parseFloat(formData.get('lng') as string) || 0,
    isDefault: formData.get('isDefault') === 'true',
  }

  try {
    await apiAddAddress(token, payload)
    revalidatePath('/dashboard/profile')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to add address' }
  }
}

export async function removeAddress(addressId: string): Promise<void> {
  const token = (await cookies()).get('access_token')?.value
  if (!token) throw new Error('Not authenticated')
  await apiRemoveAddress(token, addressId)
  revalidatePath('/dashboard/profile')
}

export async function getAvatarUploadUrl(
  fileName: string,
  contentType: string,
): Promise<PresignedUrlResult> {
  const token = (await cookies()).get('access_token')?.value
  if (!token) throw new Error('Not authenticated')
  return apiGetPresignedUrl(token, fileName, contentType, 'avatars' as MediaFolder)
}

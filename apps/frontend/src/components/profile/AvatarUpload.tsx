'use client'

import { useRef, useState, useTransition } from 'react'
import { getAvatarUploadUrl } from '@/app/actions/profile'

interface Props {
  email: string
  currentUrl?: string
  onUploaded: (publicUrl: string) => void
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export default function AvatarUpload({ email, currentUrl, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [progress, setProgress] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function initials() {
    return email ? email[0].toUpperCase() : '?'
  }

  async function handleFile(file: File) {
    setErrorMsg(null)

    if (!ALLOWED.includes(file.type)) {
      setErrorMsg('Only JPEG, PNG or WebP images are allowed.')
      return
    }
    if (file.size > MAX_BYTES) {
      setErrorMsg('File must be under 5 MB.')
      return
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setProgress('uploading')

    startTransition(async () => {
      try {
        // 1. Get presigned URL from server action
        const { uploadUrl } = await getAvatarUploadUrl(file.name, file.type)

        // 2. PUT directly to Cloudflare R2
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!res.ok) throw new Error('Upload failed')

        // Derive permanent public URL: strip query string from the presigned URL
        // and replace private endpoint with the public R2 bucket domain
        const PUBLIC_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL!
        const objectPath = new URL(uploadUrl).pathname // e.g. /cloudshelf/avatars/uuid.jpg
        // Path is /{bucket}/{key} — drop the bucket segment since PUBLIC_BASE already points to bucket root
        const key = objectPath.split('/').slice(2).join('/') // avatars/uuid.jpg
        const finalPublicUrl = `${PUBLIC_BASE}/${key}`

        setProgress('done')
        onUploaded(finalPublicUrl)
      } catch (err: unknown) {
        setProgress('error')
        setPreview(currentUrl ?? null)
        setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle — click to pick file */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative group w-24 h-24 rounded-full overflow-hidden ring-4 ring-orange-100 shadow-lg focus:outline-none focus:ring-orange-300"
        title="Click to change avatar"
      >
        {preview ? (
          <img src={preview} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-extrabold text-3xl">
            {initials()}
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-white text-xs font-semibold">Change</span>
        </div>
        {/* Upload progress spinner */}
        {(isPending || progress === 'uploading') && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}
      </button>

      <p className="text-xs text-gray-400">JPG, PNG or WebP · max 5 MB</p>

      {progress === 'done' && (
        <p className="text-xs text-green-600 font-medium">✅ Uploaded — save to apply</p>
      )}
      {errorMsg && (
        <p className="text-xs text-red-500 text-center max-w-[200px]">{errorMsg}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

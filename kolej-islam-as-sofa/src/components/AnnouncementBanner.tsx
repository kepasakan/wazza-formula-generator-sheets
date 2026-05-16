'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Megaphone, X, ChevronRight } from 'lucide-react'

type Announcement = {
  id: string
  title: string
  content: string
  createdAt: string
  imageUrl?: string | null
}

type Props = {
  announcement: Announcement
  readHref: string
  userId: string
}

export default function AnnouncementBanner({ announcement, readHref, userId }: Props) {
  const [visible, setVisible] = useState(false)
  const storageKey = `announcement-dismissed-${userId}-${announcement.id}`

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey)
    if (!dismissed) setVisible(true)
  }, [storageKey])

  const dismiss = () => {
    localStorage.setItem(storageKey, '1')
    setVisible(false)
  }

  if (!visible) return null

  const excerpt = announcement.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)

  return (
    <div className="bg-teal-700 rounded-xl overflow-hidden flex">
      {announcement.imageUrl && (
        <div className="hidden sm:block flex-shrink-0 w-36 relative">
          <Image
            src={announcement.imageUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="flex items-start gap-4 px-5 py-4 flex-1 min-w-0">
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Megaphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-teal-200 mb-0.5">Hebahan Terbaru</p>
          <p className="font-semibold text-white">{announcement.title}</p>
          {excerpt && (
            <p className="text-sm text-teal-100 mt-0.5 line-clamp-1">{excerpt}…</p>
          )}
          <Link
            href={readHref}
            className="inline-flex items-center gap-1 text-xs text-teal-200 hover:text-white transition mt-1.5 font-medium"
          >
            Baca selanjutnya <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <button
          onClick={dismiss}
          className="p-1.5 text-teal-200 hover:text-white hover:bg-white/10 rounded-lg transition flex-shrink-0"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

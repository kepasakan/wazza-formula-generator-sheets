import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function LecturerAnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const { id } = await params
  const announcement = await prisma.announcement.findUnique({ where: { id } })

  if (!announcement || !announcement.isPublished) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/dashboard/lecturer/announcements" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Hebahan
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <p className="text-xs text-gray-400 mb-2">
          {new Date(announcement.createdAt).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{announcement.title}</h1>
        <div
          className="rich-content prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: announcement.content }}
        />
      </div>
    </div>
  )
}

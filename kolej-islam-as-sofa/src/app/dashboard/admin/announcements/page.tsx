import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AnnouncementsManager from './AnnouncementsManager'

export default async function AdminAnnouncementsPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/dashboard')

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, isPublished: true, imageUrl: true, createdAt: true, updatedAt: true },
  })

  return <AnnouncementsManager initialAnnouncements={announcements.map(a => ({
    ...a,
    imageUrl: a.imageUrl ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }))} />
}

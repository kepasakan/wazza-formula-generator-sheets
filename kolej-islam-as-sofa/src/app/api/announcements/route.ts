import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where = session.role === 'ADMIN' ? {} : { isPublished: true }

  const announcements = await prisma.announcement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, isPublished: true, createdAt: true, updatedAt: true },
  })

  return NextResponse.json(announcements)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, content, isPublished } = await req.json()

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Tajuk dan kandungan diperlukan' }, { status: 400 })
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      isPublished: isPublished ?? false,
    },
  })

  return NextResponse.json(announcement, { status: 201 })
}

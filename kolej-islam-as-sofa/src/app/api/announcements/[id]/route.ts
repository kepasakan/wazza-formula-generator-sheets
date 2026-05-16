import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const announcement = await prisma.announcement.findUnique({ where: { id } })

  if (!announcement) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })
  if (!announcement.isPublished && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })
  }

  return NextResponse.json(announcement)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { title, content, isPublished, imageUrl } = await req.json()

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Tajuk dan kandungan diperlukan' }, { status: 400 })
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      title: title.trim(),
      content: content.trim(),
      isPublished: isPublished ?? false,
      imageUrl: imageUrl !== undefined ? imageUrl : undefined,
    },
  })

  return NextResponse.json(announcement)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await prisma.announcement.delete({ where: { id } })

  return NextResponse.json({ success: true })
}

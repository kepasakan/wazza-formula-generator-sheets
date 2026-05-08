import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleId } = await params

  const mod = await prisma.module.findFirst({
    where: { id: moduleId, course: { lecturerId: session.userId } },
    include: { _count: { select: { contents: true } } },
  })
  if (!mod) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { type, title, contentUrl, youtubeId, textContent } = await req.json()
  if (!title?.trim() || !type) {
    return NextResponse.json({ error: 'Title and type required' }, { status: 400 })
  }

  const content = await prisma.moduleContent.create({
    data: {
      moduleId,
      type,
      title: title.trim(),
      contentUrl: contentUrl ?? null,
      youtubeId: youtubeId ?? null,
      textContent: textContent ?? null,
      orderIndex: mod._count.contents,
    },
  })

  return NextResponse.json(content, { status: 201 })
}

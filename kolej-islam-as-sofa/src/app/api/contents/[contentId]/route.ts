import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { contentId } = await params

  const content = await prisma.moduleContent.findFirst({
    where: { id: contentId, module: { course: { lecturerId: session.userId } } },
  })
  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { title, contentUrl, youtubeId, textContent } = await req.json()

  const updated = await prisma.moduleContent.update({
    where: { id: contentId },
    data: {
      title: title?.trim() ?? content.title,
      contentUrl: contentUrl ?? content.contentUrl,
      youtubeId: youtubeId ?? content.youtubeId,
      textContent: textContent !== undefined ? textContent : content.textContent,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { contentId } = await params

  const content = await prisma.moduleContent.findFirst({
    where: { id: contentId, module: { course: { lecturerId: session.userId } } },
  })
  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.moduleContent.delete({ where: { id: contentId } })

  return NextResponse.json({ success: true })
}

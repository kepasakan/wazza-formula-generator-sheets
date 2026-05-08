import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { courseId } = await params

  const course = await prisma.course.findFirst({
    where: { id: courseId, lecturerId: session.userId },
  })
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const { title, description, orderIndex } = await req.json()
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }

  const module = await prisma.module.create({
    data: {
      courseId,
      title: title.trim(),
      description: description ?? null,
      orderIndex: orderIndex ?? 0,
    },
  })

  return NextResponse.json(module, { status: 201 })
}

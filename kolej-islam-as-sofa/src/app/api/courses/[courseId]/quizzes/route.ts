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
  if (!course) return NextResponse.json({ error: 'Kursus tidak dijumpai' }, { status: 404 })

  const { title, description, duration, startTime, endTime } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Tajuk diperlukan' }, { status: 400 })

  const quiz = await prisma.quiz.create({
    data: {
      courseId,
      title: title.trim(),
      description: description?.trim() || null,
      duration: Number(duration) || 30,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      isPublished: false,
    },
  })

  return NextResponse.json(quiz, { status: 201 })
}

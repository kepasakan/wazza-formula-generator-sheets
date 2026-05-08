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

  const { title, description, dueDate, maxScore } = await req.json()

  if (!title?.trim()) return NextResponse.json({ error: 'Tajuk diperlukan' }, { status: 400 })
  if (!dueDate) return NextResponse.json({ error: 'Tarikh akhir diperlukan' }, { status: 400 })
  if (typeof maxScore !== 'number' || maxScore < 1) {
    return NextResponse.json({ error: 'Markah tidak sah' }, { status: 400 })
  }

  const assignment = await prisma.assignment.create({
    data: {
      courseId,
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: new Date(dueDate),
      maxScore,
    },
  })

  return NextResponse.json(assignment, { status: 201 })
}

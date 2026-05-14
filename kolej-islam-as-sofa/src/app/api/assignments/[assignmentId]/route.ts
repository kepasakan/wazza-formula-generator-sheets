import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { assignmentId } = await params

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, course: { lecturerId: session.userId } },
  })
  if (!assignment) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })

  const { title, description, dueDate, maxScore } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Tajuk diperlukan' }, { status: 400 })

  const updated = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      title: title.trim(),
      description: description || null,
      dueDate: new Date(dueDate),
      maxScore: Number(maxScore) || 100,
    },
  })

  return NextResponse.json(updated)
}

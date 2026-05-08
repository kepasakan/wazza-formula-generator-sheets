import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function verifyOwnership(quizId: string, lecturerId: string) {
  return prisma.quiz.findFirst({
    where: { id: quizId, course: { lecturerId } },
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { quizId } = await params
  const quiz = await verifyOwnership(quizId, session.userId)
  if (!quiz) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })

  const { title, description, duration, startTime, endTime, isPublished } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Tajuk diperlukan' }, { status: 400 })

  const updated = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      duration: Number(duration) || 30,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      isPublished: Boolean(isPublished),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { quizId } = await params
  const quiz = await verifyOwnership(quizId, session.userId)
  if (!quiz) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })

  // Cascade: answers → attempts → options → questions → quiz
  await prisma.quizAnswer.deleteMany({ where: { attempt: { quizId } } })
  await prisma.quizAttempt.deleteMany({ where: { quizId } })
  await prisma.quizOption.deleteMany({ where: { question: { quizId } } })
  await prisma.quizQuestion.deleteMany({ where: { quizId } })
  await prisma.quiz.delete({ where: { id: quizId } })

  return NextResponse.json({ success: true })
}

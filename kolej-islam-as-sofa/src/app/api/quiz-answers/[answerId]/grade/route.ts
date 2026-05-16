import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ answerId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { answerId } = await params
  const { marks, feedback } = await req.json() as { marks: number; feedback?: string }

  const answer = await prisma.quizAnswer.findFirst({
    where: { id: answerId },
    include: {
      question: { include: { quiz: { include: { course: true } } } },
      attempt: true,
    },
  })
  if (!answer) return NextResponse.json({ error: 'Jawapan tidak dijumpai' }, { status: 404 })
  if (answer.question.quiz.course.lecturerId !== session.userId) {
    return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 403 })
  }
  if (answer.question.type !== 'ESSAY') {
    return NextResponse.json({ error: 'Bukan soalan subjektif' }, { status: 400 })
  }

  const clampedMarks = Math.max(0, Math.min(Math.round(marks), answer.question.marks))

  await prisma.quizAnswer.update({
    where: { id: answerId },
    data: {
      marksAwarded: clampedMarks,
      essayFeedback: feedback?.trim() || null,
    },
  })

  const allAnswers = await prisma.quizAnswer.findMany({
    where: { attemptId: answer.attempt.id },
    select: { marksAwarded: true },
  })
  const newScore = allAnswers.reduce((s, a) => s + (a.marksAwarded ?? 0), 0)

  await prisma.quizAttempt.update({
    where: { id: answer.attempt.id },
    data: { score: newScore },
  })

  return NextResponse.json({ marks: clampedMarks, newScore })
}

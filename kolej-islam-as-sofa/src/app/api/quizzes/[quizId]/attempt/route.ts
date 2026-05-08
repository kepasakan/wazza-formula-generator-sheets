import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { quizId } = await params

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      isPublished: true,
      course: { enrollments: { some: { studentId: session.userId } } },
    },
  })
  if (!quiz) return NextResponse.json({ error: 'Kuiz tidak dijumpai' }, { status: 404 })

  // Check for existing attempt
  const existing = await prisma.quizAttempt.findFirst({
    where: { quizId, studentId: session.userId },
  })
  if (existing) return NextResponse.json(existing)

  const attempt = await prisma.quizAttempt.create({
    data: { quizId, studentId: session.userId },
  })

  return NextResponse.json(attempt, { status: 201 })
}

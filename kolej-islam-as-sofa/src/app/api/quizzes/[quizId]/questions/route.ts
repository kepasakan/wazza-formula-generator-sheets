import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { quizId } = await params

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, course: { lecturerId: session.userId } },
    include: { _count: { select: { questions: true } } },
  })
  if (!quiz) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })

  const { questionText, type, marks, options } = await req.json()

  if (!questionText?.trim()) return NextResponse.json({ error: 'Teks soalan diperlukan' }, { status: 400 })
  if (type !== 'ESSAY') {
    if (!options?.length || !options.some((o: { isCorrect: boolean }) => o.isCorrect)) {
      return NextResponse.json({ error: 'Sekurang-kurangnya satu jawapan betul diperlukan' }, { status: 400 })
    }
  }

  const question = await prisma.quizQuestion.create({
    data: {
      quizId,
      questionText: questionText.trim(),
      type: type ?? 'MCQ',
      marks: Number(marks) || 1,
      orderIndex: quiz._count.questions,
      options: {
        create: options.map((o: { optionText: string; isCorrect: boolean }, i: number) => ({
          optionText: o.optionText.trim(),
          isCorrect: Boolean(o.isCorrect),
          orderIndex: i,
        })),
      },
    },
    include: { options: { orderBy: { orderIndex: 'asc' } } },
  })

  return NextResponse.json(question, { status: 201 })
}

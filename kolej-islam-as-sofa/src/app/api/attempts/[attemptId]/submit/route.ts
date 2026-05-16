import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { attemptId } = await params

  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, studentId: session.userId, status: 'IN_PROGRESS' },
  })
  if (!attempt) return NextResponse.json({ error: 'Cubaan tidak dijumpai' }, { status: 404 })

  const { answers } = await req.json() as {
    answers: { questionId: string; selectedOptionId?: string | null; essayAnswer?: string | null }[]
  }

  const questions = await prisma.quizQuestion.findMany({
    where: { quizId: attempt.quizId },
    include: { options: true },
  })

  let totalScore = 0

  const answerData = questions.map((q) => {
    const studentAnswer = answers.find((a) => a.questionId === q.id)

    if (q.type === 'ESSAY') {
      return {
        attemptId,
        questionId: q.id,
        selectedOptionId: null as string | null,
        essayAnswer: studentAnswer?.essayAnswer?.trim() ?? null,
        isCorrect: null as boolean | null,
        marksAwarded: null as number | null,
        _question: q,
        _selectedOption: null as typeof q.options[0] | null,
        _correctOption: null as typeof q.options[0] | null,
      }
    }

    const selectedOptionId = studentAnswer?.selectedOptionId ?? null
    const selectedOption = q.options.find((o) => o.id === selectedOptionId) ?? null
    const correctOption = q.options.find((o) => o.isCorrect) ?? null
    const isCorrect = selectedOption?.isCorrect === true
    const marksAwarded = isCorrect ? q.marks : 0

    if (isCorrect) totalScore += q.marks

    return {
      attemptId,
      questionId: q.id,
      selectedOptionId,
      essayAnswer: null as string | null,
      isCorrect,
      marksAwarded,
      _question: q,
      _selectedOption: selectedOption,
      _correctOption: correctOption,
    }
  })

  for (const a of answerData) {
    await prisma.quizAnswer.create({
      data: {
        attemptId: a.attemptId,
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId,
        essayAnswer: a.essayAnswer,
        isCorrect: a.isCorrect,
        marksAwarded: a.marksAwarded,
      },
    })
  }

  await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: { status: 'SUBMITTED', submittedAt: new Date(), score: totalScore },
  })

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0)

  return NextResponse.json({
    score: totalScore,
    totalMarks,
    results: answerData.map((a) => ({
      questionId: a.questionId,
      questionText: a._question.questionText,
      type: a._question.type,
      marks: a._question.marks,
      isCorrect: a.isCorrect,
      marksAwarded: a.marksAwarded,
      essayAnswer: a.essayAnswer,
      essayFeedback: null,
      selectedOptionId: a.selectedOptionId,
      selectedOptionText: a._selectedOption?.optionText ?? null,
      correctOptionId: a._correctOption?.id ?? null,
      correctOptionText: a._correctOption?.optionText ?? null,
      options: a._question.options.map((o) => ({
        id: o.id,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
      })),
    })),
  })
}

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
    answers: { questionId: string; selectedOptionId: string | null }[]
  }

  // Fetch all questions + options with correct answers
  const questions = await prisma.quizQuestion.findMany({
    where: { quizId: attempt.quizId },
    include: { options: true },
  })

  // Grade answers
  let totalScore = 0
  let totalMarks = 0

  const answerData = questions.map((q) => {
    totalMarks += q.marks
    const studentAnswer = answers.find((a) => a.questionId === q.id)
    const selectedOptionId = studentAnswer?.selectedOptionId ?? null
    const selectedOption = q.options.find((o) => o.id === selectedOptionId)
    const correctOption = q.options.find((o) => o.isCorrect)
    const isCorrect = selectedOption?.isCorrect === true

    if (isCorrect) totalScore += q.marks

    return {
      attemptId,
      questionId: q.id,
      selectedOptionId,
      isCorrect,
      // for result display
      _question: q,
      _selectedOption: selectedOption ?? null,
      _correctOption: correctOption ?? null,
    }
  })

  // Save answers + update attempt
  await prisma.quizAnswer.createMany({
    data: answerData.map((a) => ({
      attemptId: a.attemptId,
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      isCorrect: a.isCorrect,
    })),
  })

  await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: { status: 'SUBMITTED', submittedAt: new Date(), score: totalScore },
  })

  return NextResponse.json({
    score: totalScore,
    totalMarks,
    results: answerData.map((a) => ({
      questionId: a.questionId,
      questionText: a._question.questionText,
      marks: a._question.marks,
      isCorrect: a.isCorrect,
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

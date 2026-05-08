import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import QuizAttemptPage from './QuizAttemptPage'

export default async function QuizPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const { courseId, quizId } = await params

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: session.userId, courseId } },
    include: { course: { select: { code: true } } },
  })
  if (!enrollment) notFound()

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, courseId, isPublished: true },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          options: {
            orderBy: { orderIndex: 'asc' },
            select: { id: true, optionText: true }, // exclude isCorrect from client
          },
        },
      },
    },
  })
  if (!quiz) notFound()

  const existingAttempt = await prisma.quizAttempt.findFirst({
    where: { quizId, studentId: session.userId },
    select: { id: true, startedAt: true, status: true, score: true },
  })

  const totalMarks = quiz.questions.reduce((s, q) => s + q.marks, 0)

  // If attempt is submitted, load full answer review from DB
  let initialResults = null
  if (existingAttempt?.status === 'SUBMITTED') {
    const dbAnswers = await prisma.quizAnswer.findMany({
      where: { attemptId: existingAttempt.id },
      include: {
        question: {
          include: { options: { orderBy: { orderIndex: 'asc' } } },
        },
        selectedOption: true,
      },
    })

    // Sort by question orderIndex
    dbAnswers.sort((a, b) => a.question.orderIndex - b.question.orderIndex)

    initialResults = dbAnswers.map((a) => {
      const correctOption = a.question.options.find((o) => o.isCorrect)
      return {
        questionId: a.questionId,
        questionText: a.question.questionText,
        marks: a.question.marks,
        isCorrect: a.isCorrect ?? false,
        selectedOptionId: a.selectedOptionId ?? null,
        selectedOptionText: a.selectedOption?.optionText ?? null,
        correctOptionId: correctOption?.id ?? null,
        correctOptionText: correctOption?.optionText ?? null,
        options: a.question.options.map((o) => ({
          id: o.id,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
        })),
      }
    })
  }

  return (
    <QuizAttemptPage
      quizId={quiz.id}
      courseId={courseId}
      courseCode={enrollment.course.code}
      quizTitle={quiz.title}
      quizDescription={quiz.description ?? null}
      duration={quiz.duration}
      questions={quiz.questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        type: q.type,
        marks: q.marks,
        orderIndex: q.orderIndex,
        options: q.options,
      }))}
      existingAttempt={
        existingAttempt
          ? {
              id: existingAttempt.id,
              startedAt: existingAttempt.startedAt.toISOString(),
              status: existingAttempt.status as 'IN_PROGRESS' | 'SUBMITTED',
              score: existingAttempt.score ?? null,
            }
          : null
      }
      initialResults={initialResults}
      totalMarks={totalMarks}
    />
  )
}

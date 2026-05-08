import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Eye, EyeOff } from 'lucide-react'
import QuestionBuilder from './QuestionBuilder'

export default async function QuizBuilderPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const { courseId, quizId } = await params

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, courseId, course: { lecturerId: session.userId } },
    include: {
      course: { select: { title: true, code: true } },
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { options: { orderBy: { orderIndex: 'asc' } } },
      },
    },
  })
  if (!quiz) notFound()

  const totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <div>
        <Link
          href={`/dashboard/lecturer/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {quiz.course.code} — {quiz.course.title}
        </Link>

        {/* Quiz info card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{quiz.title}</h2>
                {quiz.isPublished ? (
                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    <Eye className="w-3 h-3" /> Aktif — Pelajar boleh ambil
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    <EyeOff className="w-3 h-3" /> Draf — Belum diaktifkan
                  </span>
                )}
              </div>
              {quiz.description && (
                <p className="text-gray-500 text-sm mt-0.5">{quiz.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {quiz.duration} minit
                </span>
                <span>{quiz.questions.length} soalan</span>
                <span>{totalMarks} markah jumlah</span>
                {quiz.startTime && (
                  <span>
                    Buka: {new Date(quiz.startTime).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                  </span>
                )}
                {quiz.endTime && (
                  <span>
                    Tutup: {new Date(quiz.endTime).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!quiz.isPublished && quiz.questions.length === 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              Tambah sekurang-kurangnya satu soalan sebelum mengaktifkan kuiz.
            </div>
          )}
        </div>
      </div>

      {/* Question builder */}
      <QuestionBuilder
        quizId={quiz.id}
        initialQuestions={quiz.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          type: q.type as 'MCQ' | 'TRUE_FALSE',
          marks: q.marks,
          orderIndex: q.orderIndex,
          options: q.options.map((o) => ({
            id: o.id,
            optionText: o.optionText,
            isCorrect: o.isCorrect,
            orderIndex: o.orderIndex,
          })),
        }))}
        totalMarks={totalMarks}
      />
    </div>
  )
}

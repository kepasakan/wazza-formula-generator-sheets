import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Users, CheckCircle, XCircle, ChevronDown, AlertCircle } from 'lucide-react'
import EssayGrader from './EssayGrader'

export default async function QuizResultsPage({
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
      course: {
        include: {
          enrollments: {
            include: { student: { select: { id: true, name: true, matricNo: true } } },
          },
        },
      },
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { options: { orderBy: { orderIndex: 'asc' } } },
      },
      attempts: {
        where: { status: 'SUBMITTED' },
        include: {
          student: { select: { id: true, name: true, matricNo: true } },
          answers: {
            include: { selectedOption: true, question: true },
          },
        },
        orderBy: { submittedAt: 'desc' },
      },
    },
  })
  if (!quiz) notFound()

  const hasEssay = quiz.questions.some((q) => q.type === 'ESSAY')
  const totalMarks = quiz.questions.reduce((s, q) => s + q.marks, 0)
  const attemptMap = new Map(quiz.attempts.map((a) => [a.studentId, a]))
  const enrolled = quiz.course.enrollments

  const attempted = enrolled.filter((e) => attemptMap.has(e.student.id))
  const notAttempted = enrolled.filter((e) => !attemptMap.has(e.student.id))

  const avgScore =
    quiz.attempts.length > 0
      ? Math.round(quiz.attempts.reduce((s, a) => s + (a.score ?? 0), 0) / quiz.attempts.length)
      : null

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href={`/dashboard/lecturer/courses/${courseId}/quizzes/${quizId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Pembina Soalan
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xl font-bold text-gray-900">{quiz.title}</h2>
          {quiz.description && <p className="text-gray-500 text-sm mt-0.5">{quiz.description}</p>}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{quiz.duration} minit</span>
            <span>{quiz.questions.length} soalan · {totalMarks} markah</span>
            {hasEssay && (
              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" /> Ada soalan subjektif
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Pelajar', value: enrolled.length, color: 'text-gray-700', bg: 'bg-gray-50' },
              { label: 'Dah Jawab', value: quiz.attempts.length, color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Belum Jawab', value: notAttempted.length, color: 'text-orange-700', bg: 'bg-orange-50' },
              {
                label: 'Avg Markah',
                value: avgScore !== null ? `${avgScore}/${totalMarks}` : '—',
                color: 'text-green-700',
                bg: 'bg-green-50',
              },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className={`text-xs mt-0.5 ${s.color} opacity-70`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {attempted.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Sudah Menjawab
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {attempted.length}
            </span>
          </h3>
          <div className="space-y-3">
            {attempted.map((e) => {
              const attempt = attemptMap.get(e.student.id)!
              const pct = totalMarks > 0 ? Math.round(((attempt.score ?? 0) / totalMarks) * 100) : 0
              const hasUngraded = attempt.answers.some(
                (a) => a.question.type === 'ESSAY' && a.marksAwarded === null
              )

              return (
                <details key={e.student.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden group">
                  <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors list-none">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-700 text-xs font-semibold">
                        {e.student.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{e.student.name}</p>
                      {e.student.matricNo && <p className="text-xs text-gray-400">{e.student.matricNo}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {hasUngraded && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Perlu dinilai
                        </span>
                      )}
                      <div className="text-right">
                        <p className={`text-sm font-bold ${pct >= 70 ? 'text-green-700' : pct >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                          {attempt.score ?? 0}/{totalMarks}
                        </p>
                        <p className="text-xs text-gray-400">{pct}%</p>
                      </div>
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-orange-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                    </div>
                  </summary>

                  <div className="border-t border-gray-100 px-5 py-3 space-y-3">
                    <p className="text-xs text-gray-400">
                      Dihantar:{' '}
                      {attempt.submittedAt
                        ? new Date(attempt.submittedAt).toLocaleDateString('ms-MY', { dateStyle: 'medium' })
                        : '—'}
                    </p>
                    {quiz.questions.map((q, idx) => {
                      const ans = attempt.answers.find((a) => a.questionId === q.id)

                      if (q.type === 'ESSAY') {
                        const graded = ans?.marksAwarded !== null && ans?.marksAwarded !== undefined
                        return (
                          <div key={q.id} className="px-3 py-3 rounded-xl bg-blue-50 border border-blue-100">
                            <div className="flex items-start gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                              <p className="text-gray-700 font-medium text-xs">S{idx + 1}. {q.questionText}</p>
                              <span className="ml-auto text-xs text-blue-600 flex-shrink-0">Subjektif · {q.marks} markah</span>
                            </div>
                            {ans?.essayAnswer ? (
                              <div className="bg-white rounded-lg px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap mb-2 border border-blue-100">
                                {ans.essayAnswer}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic mb-2">Tidak dijawab</p>
                            )}
                            {ans && (
                              <EssayGrader
                                answerId={ans.id}
                                maxMarks={q.marks}
                                initialMarks={graded ? (ans.marksAwarded ?? null) : null}
                                initialFeedback={ans.essayFeedback ?? null}
                              />
                            )}
                          </div>
                        )
                      }

                      const correct = q.options.find((o) => o.isCorrect)
                      const isCorrect = ans?.isCorrect ?? false
                      return (
                        <div key={q.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                          {isCorrect
                            ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-700 font-medium text-xs mb-1">S{idx + 1}. {q.questionText}</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className={ans?.selectedOption ? (isCorrect ? 'text-green-700' : 'text-red-600') : 'text-gray-400'}>
                                Jawab: {ans?.selectedOption?.optionText ?? 'Tidak dijawab'}
                              </span>
                              {!isCorrect && (
                                <span className="text-green-700">
                                  Betul: {correct?.optionText ?? '—'}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-medium flex-shrink-0 ${isCorrect ? 'text-green-700' : 'text-gray-400'}`}>
                            {isCorrect ? `+${q.marks}` : '0'}/{q.marks}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </details>
              )
            })}
          </div>
        </div>
      )}

      {notAttempted.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            Belum Menjawab
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {notAttempted.length}
            </span>
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {notAttempted.map((e) => (
              <div key={e.student.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-500 text-xs font-semibold">
                    {e.student.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{e.student.name}</p>
                  {e.student.matricNo && <p className="text-xs text-gray-400">{e.student.matricNo}</p>}
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Belum jawab
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {quiz.attempts.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
          Tiada pelajar yang telah menjawab kuiz ini lagi.
        </div>
      )}
    </div>
  )
}

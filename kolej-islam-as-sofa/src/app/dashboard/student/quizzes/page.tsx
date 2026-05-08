import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Clock, CheckCircle, Lock, ChevronRight } from 'lucide-react'

export default async function StudentQuizzesPage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: session.userId },
    include: {
      course: {
        include: {
          quizzes: {
            where: { isPublished: true },
            include: {
              attempts: { where: { studentId: session.userId } },
              _count: { select: { questions: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  })

  const allQuizzes = enrollments.flatMap(e => e.course.quizzes)
  const now = new Date()
  const done = allQuizzes.filter(q => q.attempts.some(a => a.status === 'SUBMITTED')).length
  const available = allQuizzes.filter(q => {
    if (q.attempts.some(a => a.status === 'SUBMITTED')) return false
    return (!q.startTime || new Date(q.startTime) <= now) && (!q.endTime || new Date(q.endTime) > now)
  }).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Kuiz</h2>
        <p className="text-gray-500 text-sm mt-1">{allQuizzes.length} kuiz keseluruhan</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Boleh Ambil', value: available, color: 'text-purple-700', bg: 'bg-purple-50', icon: <ClipboardList className="w-5 h-5" /> },
          { label: 'Selesai', value: done, color: 'text-green-700', bg: 'bg-green-50', icon: <CheckCircle className="w-5 h-5" /> },
          { label: 'Lain-lain', value: allQuizzes.length - available - done, color: 'text-gray-600', bg: 'bg-gray-50', icon: <Lock className="w-5 h-5" /> },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-3`}>
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className={`text-xs ${s.color} opacity-70`}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grouped by course */}
      <div className="space-y-6">
        {enrollments.map(({ course }) => {
          if (course.quizzes.length === 0) return null
          return (
            <div key={course.id}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">{course.code}</span>
                  <h3 className="font-semibold text-gray-900">{course.title}</h3>
                </div>
                <Link href={`/dashboard/student/courses/${course.id}`} className="text-xs text-green-700 hover:underline flex items-center gap-1">
                  Masuk Kursus <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {course.quizzes.map(q => {
                  const attempt = q.attempts.find(a => a.status === 'SUBMITTED')
                  const isCompleted = !!attempt
                  const isAvailable = (!q.startTime || new Date(q.startTime) <= now) && (!q.endTime || new Date(q.endTime) > now)
                  const isLocked = !isAvailable && !isCompleted

                  return (
                    <div key={q.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-medium text-gray-900">{q.title}</h4>
                            {isCompleted && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                ✓ {attempt.score} markah
                              </span>
                            )}
                          </div>
                          {q.description && <p className="text-sm text-gray-500 mt-0.5">{q.description}</p>}
                          <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{q.duration} minit</span>
                            <span>{q._count.questions} soalan</span>
                            {q.startTime && (
                              <span>
                                Mula: {new Date(q.startTime).toLocaleDateString('ms-MY', { dateStyle: 'short' })}
                                {' '}{new Date(q.startTime).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {q.endTime && (
                              <span>
                                Tamat: {new Date(q.endTime).toLocaleDateString('ms-MY', { dateStyle: 'short' })}
                                {' '}{new Date(q.endTime).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <Link href={`/dashboard/student/courses/${course.id}/quiz/${q.id}`} className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-xl hover:bg-green-200 transition font-medium">
                              Semak
                            </Link>
                          ) : isAvailable ? (
                            <Link href={`/dashboard/student/courses/${course.id}/quiz/${q.id}`} className="text-sm bg-purple-700 text-white px-4 py-2 rounded-xl hover:bg-purple-800 transition font-medium">
                              Mula Kuiz
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-400 bg-gray-100 px-4 py-2 rounded-xl">
                              {q.startTime && new Date(q.startTime) > now ? 'Belum dibuka' : 'Ditutup'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

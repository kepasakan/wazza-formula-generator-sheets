import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, FileText, ClipboardList, CalendarCheck, ChevronRight } from 'lucide-react'

export default async function StudentResultsPage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: session.userId },
    include: {
      course: {
        include: {
          assignments: {
            include: { submissions: { where: { studentId: session.userId } } },
          },
          quizzes: {
            where: { isPublished: true },
            include: { attempts: { where: { studentId: session.userId, status: 'SUBMITTED' } } },
          },
          attendanceSessions: {
            include: { records: { where: { studentId: session.userId } } },
          },
          lecturer: { select: { name: true } },
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Keputusan Akademik</h2>
        <p className="text-gray-500 text-sm mt-1">{enrollments.length} kursus</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Tiada rekod keputusan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map(({ course }) => {
            const gradedSubmissions = course.assignments.flatMap(a => a.submissions.filter(s => s.status === 'GRADED'))
            const avgAssignment = gradedSubmissions.length > 0
              ? Math.round(gradedSubmissions.reduce((s, sub) => {
                  const a = course.assignments.find(a => a.submissions.some(ss => ss.id === sub.id))
                  return s + ((sub.score ?? 0) / (a?.maxScore ?? 100)) * 100
                }, 0) / gradedSubmissions.length)
              : null

            const completedAttempts = course.quizzes.flatMap(q => q.attempts)
            const avgQuiz = completedAttempts.length > 0
              ? Math.round(completedAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / completedAttempts.length)
              : null

            const totalSessions = course.attendanceSessions.length
            const present = course.attendanceSessions.filter(s => s.records[0]?.status === 'PRESENT').length
            const attendancePct = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : null

            const submitted = course.assignments.filter(a => a.submissions.length > 0).length

            return (
              <div key={course.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        {course.code}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">{course.title}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Pensyarah: {course.lecturer.name}</p>
                  </div>
                  <Link
                    href={`/dashboard/student/courses/${course.id}`}
                    className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 transition"
                  >
                    Masuk <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  {/* Assignments */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Tugasan</span>
                    </div>
                    {avgAssignment !== null ? (
                      <p className={`text-2xl font-bold ${avgAssignment >= 70 ? 'text-green-700' : avgAssignment >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                        {avgAssignment}%
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-gray-300">—</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {submitted}/{course.assignments.length} dihantar
                    </p>
                  </div>

                  {/* Quizzes */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Kuiz</span>
                    </div>
                    {avgQuiz !== null ? (
                      <p className={`text-2xl font-bold ${avgQuiz >= 70 ? 'text-green-700' : avgQuiz >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                        {avgQuiz}
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-gray-300">—</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {completedAttempts.length}/{course.quizzes.length} selesai
                    </p>
                  </div>

                  {/* Attendance */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Kehadiran</span>
                    </div>
                    {attendancePct !== null ? (
                      <p className={`text-2xl font-bold ${attendancePct >= 80 ? 'text-green-700' : attendancePct >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                        {attendancePct}%
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-gray-300">—</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {present}/{totalSessions} hadir
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

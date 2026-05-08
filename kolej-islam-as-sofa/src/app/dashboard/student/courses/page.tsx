import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookMarked, FileText, ClipboardList, Users, ChevronRight } from 'lucide-react'

export default async function StudentCoursesPage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: session.userId },
    include: {
      course: {
        include: {
          lecturer: { select: { name: true } },
          modules: { where: { isPublished: true } },
          assignments: { include: { submissions: { where: { studentId: session.userId } } } },
          quizzes: { where: { isPublished: true }, include: { attempts: { where: { studentId: session.userId } } } },
          enrollments: { select: { id: true } },
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Kursus Saya</h2>
        <p className="text-gray-500 text-sm mt-1">{enrollments.length} kursus didaftar</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookMarked className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Anda belum mendaftar mana-mana kursus</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrollments.map(({ course }) => {
            const submitted = course.assignments.filter(a => a.submissions.length > 0).length
            const completed = course.quizzes.filter(q => q.attempts.some(a => a.status === 'SUBMITTED')).length

            return (
              <Link
                key={course.id}
                href={`/dashboard/student/courses/${course.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookMarked className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      {course.code}
                    </span>
                    <h3 className="font-semibold text-gray-900 mt-1 group-hover:text-green-800 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Pensyarah: {course.lecturer.name}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-600 transition-colors flex-shrink-0 mt-1" />
                </div>

                <div className="grid grid-cols-4 gap-2 mt-4">
                  {[
                    { label: 'Modul', value: course.modules.length, icon: <BookMarked className="w-3 h-3" /> },
                    { label: 'Tugasan', value: course.assignments.length, icon: <FileText className="w-3 h-3" /> },
                    { label: 'Kuiz', value: course.quizzes.length, icon: <ClipboardList className="w-3 h-3" /> },
                    { label: 'Pelajar', value: course.enrollments.length, icon: <Users className="w-3 h-3" /> },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="flex justify-center text-gray-400 mb-0.5">{s.icon}</div>
                      <p className="text-sm font-bold text-gray-900">{s.value}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {course.assignments.length > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Tugasan dihantar</span>
                      <span>{submitted}/{course.assignments.length}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 bg-green-500 rounded-full"
                        style={{ width: `${course.assignments.length > 0 ? (submitted / course.assignments.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

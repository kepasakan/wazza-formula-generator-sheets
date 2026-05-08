import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookMarked, Users, FileText, ClipboardList, ChevronRight } from 'lucide-react'

export default async function LecturerCoursesPage() {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const courses = await prisma.course.findMany({
    where: { lecturerId: session.userId },
    include: {
      enrollments: true,
      modules: true,
      assignments: { include: { submissions: { where: { status: 'SUBMITTED' } } } },
      quizzes: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Kursus Saya</h2>
        <p className="text-gray-500 text-sm mt-1">{courses.length} kursus diajar</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookMarked className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Tiada kursus lagi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map(c => {
            const pendingGrading = c.assignments.reduce((s, a) => s + a.submissions.length, 0)
            return (
              <Link
                key={c.id}
                href={`/dashboard/lecturer/courses/${c.id}`}
                className="flex items-center gap-5 bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 hover:shadow-sm transition-all group"
              >
                <div className="w-12 h-12 bg-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{c.code}</span>
                    <span className="text-xs text-gray-400">{c.semester} {c.year}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-800 transition-colors">{c.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.enrollments.length} pelajar</span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{c.assignments.length} tugasan</span>
                    <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" />{c.quizzes.length} kuiz</span>
                    {pendingGrading > 0 && (
                      <span className="text-orange-600 font-medium">{pendingGrading} perlu nilai</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-600 transition-colors flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

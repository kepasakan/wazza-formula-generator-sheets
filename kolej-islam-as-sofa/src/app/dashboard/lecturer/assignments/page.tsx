import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, Clock, AlertCircle, ChevronRight } from 'lucide-react'

export default async function LecturerAssignmentsPage() {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const courses = await prisma.course.findMany({
    where: { lecturerId: session.userId },
    include: {
      enrollments: true,
      assignments: {
        include: { submissions: true },
        orderBy: { dueDate: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const totalPending = courses.reduce((s, c) =>
    s + c.assignments.reduce((ss, a) => ss + a.submissions.filter(sub => sub.status === 'SUBMITTED').length, 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tugasan</h2>
          <p className="text-gray-500 text-sm mt-1">Semua tugasan mengikut kursus</p>
        </div>
        {totalPending > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-700">{totalPending} perlu dinilai</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {courses.map(c => {
          const pending = c.assignments.reduce((s, a) => s + a.submissions.filter(sub => sub.status === 'SUBMITTED').length, 0)
          return (
            <div key={c.id}>
              {/* Course header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">{c.code}</span>
                  <h3 className="font-semibold text-gray-900">{c.title}</h3>
                  {pending > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                      {pending} perlu nilai
                    </span>
                  )}
                </div>
                <Link href={`/dashboard/lecturer/courses/${c.id}`} className="text-xs text-green-700 hover:underline flex items-center gap-1">
                  Urus Kursus <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {c.assignments.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 px-5 py-4 text-sm text-gray-400 text-center">
                  Tiada tugasan dalam kursus ini
                </div>
              ) : (
                <div className="space-y-2">
                  {c.assignments.map(a => {
                    const totalSub = a.submissions.length
                    const graded = a.submissions.filter(s => s.status === 'GRADED').length
                    const needsGrade = a.submissions.filter(s => s.status === 'SUBMITTED').length
                    const isOverdue = new Date() > new Date(a.dueDate)

                    return (
                      <div key={a.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-gray-900">{a.title}</h4>
                              {needsGrade > 0 && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                                  {needsGrade} perlu nilai
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Tarikh akhir: {new Date(a.dueDate).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                                {isOverdue && <span className="text-red-500 ml-1">(Tamat)</span>}
                              </span>
                              <span>Markah: {a.maxScore}</span>
                              <span className="text-blue-600 font-medium">{totalSub}/{c.enrollments.length} dihantar</span>
                              {graded > 0 && <span className="text-green-600 font-medium">{graded} dinilai</span>}
                            </div>
                          </div>
                          <Link
                            href={`/dashboard/lecturer/courses/${c.id}/assignments/${a.id}`}
                            className="flex-shrink-0 text-sm bg-green-700 text-white px-4 py-2 rounded-xl hover:bg-green-800 transition font-medium"
                          >
                            Nilai
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, Clock, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'

export default async function StudentAssignmentsPage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: session.userId },
    include: {
      course: {
        include: {
          assignments: {
            include: { submissions: { where: { studentId: session.userId } } },
            orderBy: { dueDate: 'asc' },
          },
        },
      },
    },
  })

  const allAssignments = enrollments.flatMap(e => e.course.assignments.map(a => ({ ...a, course: { id: e.course.id, code: e.course.code, title: e.course.title } })))
  const pending = allAssignments.filter(a => !a.submissions.length && new Date(a.dueDate) > new Date()).length
  const overdue = allAssignments.filter(a => !a.submissions.length && new Date(a.dueDate) <= new Date()).length
  const submitted = allAssignments.filter(a => a.submissions.length > 0).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tugasan</h2>
        <p className="text-gray-500 text-sm mt-1">{allAssignments.length} tugasan keseluruhan</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tertunggak', value: pending, color: 'text-orange-700', bg: 'bg-orange-50', icon: <Clock className="w-5 h-5" /> },
          { label: 'Tamat Tempoh', value: overdue, color: 'text-red-700', bg: 'bg-red-50', icon: <AlertCircle className="w-5 h-5" /> },
          { label: 'Dihantar', value: submitted, color: 'text-green-700', bg: 'bg-green-50', icon: <CheckCircle className="w-5 h-5" /> },
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
          if (course.assignments.length === 0) return null
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
                {course.assignments.map(a => {
                  const sub = a.submissions[0] ?? null
                  const isOverdue = new Date(a.dueDate) < new Date() && !sub
                  const daysLeft = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000)

                  return (
                    <div key={a.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-medium text-gray-900">{a.title}</h4>
                            {sub?.status === 'GRADED' && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Dinilai: {sub.score}/{a.maxScore}</span>
                            )}
                            {sub?.status === 'SUBMITTED' && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">✓ Dihantar</span>
                            )}
                            {sub?.status === 'LATE' && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Lewat</span>
                            )}
                            {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Tamat Tempoh</span>}
                          </div>
                          {a.description && <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>}
                          <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Tarikh akhir: {new Date(a.dueDate).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                            </span>
                            <span>Markah: {a.maxScore}</span>
                            {!sub && !isOverdue && daysLeft > 0 && (
                              <span className={daysLeft <= 3 ? 'text-orange-500 font-medium' : ''}>{daysLeft} hari lagi</span>
                            )}
                          </div>
                          {sub?.feedback && (
                            <div className="mt-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-sm text-green-800">
                              <span className="font-medium">Maklum balas: </span>{sub.feedback}
                            </div>
                          )}
                        </div>
                        {!sub && !isOverdue && (
                          <Link
                            href={`/dashboard/student/courses/${course.id}`}
                            className="flex-shrink-0 text-sm bg-green-700 text-white px-4 py-2 rounded-xl hover:bg-green-800 transition font-medium"
                          >
                            Hantar
                          </Link>
                        )}
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

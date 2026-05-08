import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Clock, Eye, EyeOff, BarChart2, Pencil, ChevronRight } from 'lucide-react'

export default async function LecturerQuizzesPage() {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const courses = await prisma.course.findMany({
    where: { lecturerId: session.userId },
    include: {
      quizzes: {
        include: { _count: { select: { questions: true, attempts: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Kuiz</h2>
        <p className="text-gray-500 text-sm mt-1">Semua kuiz mengikut kursus</p>
      </div>

      <div className="space-y-6">
        {courses.map(c => (
          <div key={c.id}>
            {/* Course header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">{c.code}</span>
                <h3 className="font-semibold text-gray-900">{c.title}</h3>
              </div>
              <Link href={`/dashboard/lecturer/courses/${c.id}`} className="text-xs text-green-700 hover:underline flex items-center gap-1">
                Urus Kursus <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {c.quizzes.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 px-5 py-4 text-sm text-gray-400 text-center">
                Tiada kuiz dalam kursus ini
              </div>
            ) : (
              <div className="space-y-2">
                {c.quizzes.map(q => (
                  <div key={q.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-medium text-gray-900">{q.title}</h4>
                          {q.isPublished
                            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Eye className="w-3 h-3" />Aktif</span>
                            : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1"><EyeOff className="w-3 h-3" />Draf</span>
                          }
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{q.duration} minit</span>
                          <span>{q._count.questions} soalan</span>
                          <span className="text-blue-600 font-medium">{q._count.attempts} cubaan</span>
                          {q.startTime && (
                            <span>
                              Mula: {new Date(q.startTime).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                              {' '}{new Date(q.startTime).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {q.endTime && (
                            <span>
                              Tamat: {new Date(q.endTime).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                              {' '}{new Date(q.endTime).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          href={`/dashboard/lecturer/courses/${c.id}/quizzes/${q.id}/results`}
                          className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />Keputusan
                        </Link>
                        <Link
                          href={`/dashboard/lecturer/courses/${c.id}/quizzes/${q.id}`}
                          className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

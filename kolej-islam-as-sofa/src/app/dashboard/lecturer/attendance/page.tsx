import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarCheck, CheckCircle, XCircle, ExternalLink, ChevronRight } from 'lucide-react'

export default async function LecturerAttendancePage() {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const courses = await prisma.course.findMany({
    where: { lecturerId: session.userId },
    include: {
      enrollments: true,
      attendanceSessions: {
        include: { _count: { select: { records: true } } },
        orderBy: { date: 'desc' },
      },
    },
  })

  const totalSessions = courses.reduce((s, c) => s + c.attendanceSessions.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Kehadiran</h2>
        <p className="text-gray-500 text-sm mt-1">{totalSessions} sesi dari semua kursus</p>
      </div>

      <div className="space-y-6">
        {courses.map(c => {
          const totalPresent = c.attendanceSessions.reduce((s, sess) => s + sess._count.records, 0)
          const maxPossible = c.enrollments.length * c.attendanceSessions.length
          const overallPct = maxPossible > 0 ? Math.round((totalPresent / maxPossible) * 100) : 0

          return (
            <div key={c.id}>
              {/* Course header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">{c.code}</span>
                  <h3 className="font-semibold text-gray-900">{c.title}</h3>
                  <span className="text-xs text-gray-400">{c.enrollments.length} pelajar</span>
                </div>
                <div className="flex items-center gap-3">
                  {c.attendanceSessions.length > 0 && (
                    <span className={`text-sm font-bold ${overallPct >= 80 ? 'text-green-700' : overallPct >= 50 ? 'text-orange-600' : 'text-gray-400'}`}>
                      Avg {overallPct}%
                    </span>
                  )}
                  <Link href={`/dashboard/lecturer/courses/${c.id}`} className="text-xs text-green-700 hover:underline flex items-center gap-1">
                    Urus Kursus <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {c.attendanceSessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 px-5 py-4 text-sm text-gray-400 text-center">
                  Belum ada sesi kehadiran untuk kursus ini
                </div>
              ) : (
                <div className="space-y-2">
                  {c.attendanceSessions.map(s => {
                    const pct = c.enrollments.length > 0
                      ? Math.round((s._count.records / c.enrollments.length) * 100)
                      : 0
                    const absent = c.enrollments.length - s._count.records

                    return (
                      <div key={s.id} className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 text-sm">{s.title}</p>
                            {s.isOpen && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
                                Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(s.date).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                            {' · '}
                            {new Date(s.date).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 text-green-700 font-medium">
                              <CheckCircle className="w-3.5 h-3.5" /> {s._count.records} hadir
                            </span>
                            <span className="flex items-center gap-1 text-red-500 font-medium">
                              <XCircle className="w-3.5 h-3.5" /> {absent} tidak hadir
                            </span>
                            <span className={`font-bold text-sm ${pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                              {pct}%
                            </span>
                          </div>
                          <Link
                            href={`/dashboard/lecturer/courses/${c.id}/attendance/${s.id}`}
                            className="flex items-center gap-1.5 text-xs text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Lihat Rekod
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

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CalendarCheck, CheckCircle, XCircle } from 'lucide-react'

export default async function StudentAttendancePage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: session.userId },
    include: {
      course: {
        include: {
          attendanceSessions: {
            orderBy: { date: 'desc' },
            include: { records: { where: { studentId: session.userId } } },
          },
        },
      },
    },
  })

  const courseStats = enrollments.map(e => {
    const sessions = e.course.attendanceSessions
    const present = sessions.filter(s => s.records[0]?.status === 'PRESENT').length
    const pct = sessions.length > 0 ? Math.round((present / sessions.length) * 100) : 0
    return { course: e.course, sessions, present, pct }
  })

  const totalSessions = courseStats.reduce((s, c) => s + c.sessions.length, 0)
  const totalPresent = courseStats.reduce((s, c) => s + c.present, 0)
  const overallPct = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Kehadiran</h2>
        <p className="text-gray-500 text-sm mt-1">Rekod kehadiran keseluruhan</p>
      </div>

      {/* Overall */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500 font-medium">Kehadiran Keseluruhan</p>
            <p className={`text-4xl font-bold mt-1 ${overallPct >= 80 ? 'text-green-700' : overallPct >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
              {overallPct}%
            </p>
            <p className="text-sm text-gray-400 mt-1">{totalPresent}/{totalSessions} sesi hadir</p>
          </div>
          <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${
            overallPct >= 80 ? 'border-green-500' : overallPct >= 50 ? 'border-orange-400' : 'border-red-400'
          }`}>
            <CalendarCheck className={`w-8 h-8 ${overallPct >= 80 ? 'text-green-600' : overallPct >= 50 ? 'text-orange-500' : 'text-red-500'}`} />
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${overallPct >= 80 ? 'bg-green-500' : overallPct >= 50 ? 'bg-orange-400' : 'bg-red-400'}`}
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Per course */}
      <div className="space-y-4">
        {courseStats.map(({ course, sessions, present, pct }) => (
          <div key={course.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{course.code}</span>
                <h4 className="font-semibold text-gray-900 mt-1">{course.title}</h4>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                  {pct}%
                </p>
                <p className="text-xs text-gray-400">{present}/{sessions.length}</p>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="px-5 py-4 text-center text-sm text-gray-400">Tiada sesi lagi</div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                {sessions.map(s => {
                  const status = s.records[0]?.status ?? null
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                      {status === 'PRESENT'
                        ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{s.title}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(s.date).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                        status === 'LATE' ? 'bg-orange-100 text-orange-700' :
                        status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {status === 'PRESENT' ? 'Hadir' : status === 'LATE' ? 'Lewat' : status === 'ABSENT' ? 'Tidak Hadir' : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

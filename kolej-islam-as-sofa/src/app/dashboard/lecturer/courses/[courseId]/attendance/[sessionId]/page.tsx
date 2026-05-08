import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, Users, Clock } from 'lucide-react'

export default async function AttendanceSessionPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const { courseId, sessionId } = await params

  const attendanceSession = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, courseId, course: { lecturerId: session.userId } },
    include: {
      course: {
        include: {
          enrollments: {
            include: { student: { select: { id: true, name: true, matricNo: true } } },
            orderBy: { enrolledAt: 'asc' },
          },
        },
      },
      records: {
        include: { student: { select: { id: true, name: true, matricNo: true } } },
        orderBy: { markedAt: 'asc' },
      },
    },
  })
  if (!attendanceSession) notFound()

  const presentIds = new Set(attendanceSession.records.map(r => r.student.id))
  const present = attendanceSession.records
  const absent = attendanceSession.course.enrollments
    .map(e => e.student)
    .filter(s => !presentIds.has(s.id))

  const total = attendanceSession.course.enrollments.length
  const pct = total > 0 ? Math.round((present.length / total) * 100) : 0

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <div>
        <Link
          href={`/dashboard/lecturer/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {attendanceSession.course.code} — {attendanceSession.course.title}
        </Link>

        {/* Session info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{attendanceSession.title}</h2>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date(attendanceSession.date).toLocaleDateString('ms-MY', { dateStyle: 'full' })}
                {' · '}
                {new Date(attendanceSession.date).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {attendanceSession.isOpen && (
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium animate-pulse">
                Sesi Aktif
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Jumlah Pelajar
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{present.length}</p>
              <p className="text-xs text-green-600 mt-0.5 flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" /> Hadir
              </p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{absent.length}</p>
              <p className="text-xs text-red-500 mt-0.5 flex items-center justify-center gap-1">
                <XCircle className="w-3 h-3" /> Tidak Hadir
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Kadar Kehadiran</span>
              <span className="font-semibold text-gray-700">{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-orange-400' : 'bg-red-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Hadir */}
        <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-green-50 border-b border-green-100 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-green-800 text-sm">Hadir ({present.length})</h3>
          </div>
          {present.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">Tiada pelajar hadir</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {present.map((r, idx) => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs text-gray-300 w-5 text-center flex-shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.student.name}</p>
                    {r.student.matricNo && (
                      <p className="text-xs text-gray-400">{r.student.matricNo}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(r.markedAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tidak Hadir */}
        <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-red-700 text-sm">Tidak Hadir ({absent.length})</h3>
          </div>
          {absent.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">Semua pelajar hadir! 🎉</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {absent.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs text-gray-300 w-5 text-center flex-shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500">{s.name}</p>
                    {s.matricNo && (
                      <p className="text-xs text-gray-400">{s.matricNo}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

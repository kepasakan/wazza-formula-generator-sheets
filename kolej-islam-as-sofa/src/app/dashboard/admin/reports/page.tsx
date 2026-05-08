import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BarChart3, Users, BookMarked, FileText, ClipboardList, CalendarCheck, TrendingUp } from 'lucide-react'

export default async function AdminReportsPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/dashboard')

  const [
    totalStudents, totalLecturers, totalCourses,
    totalAssignments, totalSubmissions, totalQuizzes,
    totalAttempts, totalSessions, totalRecords,
    courses,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'LECTURER' } }),
    prisma.course.count(),
    prisma.assignment.count(),
    prisma.assignmentSubmission.count(),
    prisma.quiz.count({ where: { isPublished: true } }),
    prisma.quizAttempt.count({ where: { status: 'SUBMITTED' } }),
    prisma.attendanceSession.count(),
    prisma.attendanceRecord.count({ where: { status: 'PRESENT' } }),
    prisma.course.findMany({
      include: {
        enrollments: true,
        assignments: { include: { submissions: { where: { status: 'GRADED' } } } },
        quizzes: { include: { attempts: { where: { status: 'SUBMITTED' } } } },
        attendanceSessions: { include: { _count: { select: { records: true } } } },
        lecturer: { select: { name: true } },
      },
      orderBy: { enrollments: { _count: 'desc' } },
    }),
  ])

  const submissionRate = totalAssignments > 0 && totalStudents > 0
    ? Math.round((totalSubmissions / (totalAssignments * totalStudents)) * 100)
    : 0

  const quizCompletionRate = totalQuizzes > 0 && totalStudents > 0
    ? Math.round((totalAttempts / (totalQuizzes * totalStudents)) * 100)
    : 0

  const attendanceRate = totalSessions > 0 && totalStudents > 0
    ? Math.round((totalRecords / (totalSessions * totalStudents)) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Laporan Sistem</h2>
        <p className="text-gray-500 text-sm mt-1">Ringkasan prestasi keseluruhan sistem</p>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Jumlah Pelajar', value: totalStudents, icon: <Users className="w-5 h-5" />, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Jumlah Pensyarah', value: totalLecturers, icon: <Users className="w-5 h-5" />, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Jumlah Kursus', value: totalCourses, icon: <BookMarked className="w-5 h-5" />, color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Jumlah Tugasan', value: totalAssignments, icon: <FileText className="w-5 h-5" />, color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'Kuiz Aktif', value: totalQuizzes, icon: <ClipboardList className="w-5 h-5" />, color: 'text-pink-700', bg: 'bg-pink-50' },
          { label: 'Sesi Kehadiran', value: totalSessions, icon: <CalendarCheck className="w-5 h-5" />, color: 'text-teal-700', bg: 'bg-teal-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <span className={s.color}>{s.icon}</span>
            <p className={`text-3xl font-bold ${s.color} mt-2`}>{s.value}</p>
            <p className={`text-xs ${s.color} opacity-70 mt-0.5`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Engagement rates */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          Kadar Penglibatan Pelajar
        </h3>
        <div className="space-y-4">
          {[
            { label: 'Penyerahan Tugasan', value: submissionRate, color: 'bg-green-500' },
            { label: 'Penyiapan Kuiz', value: quizCompletionRate, color: 'bg-purple-500' },
            { label: 'Kadar Kehadiran', value: attendanceRate, color: 'bg-blue-500' },
          ].map(r => (
            <div key={r.label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">{r.label}</span>
                <span className="font-semibold text-gray-900">{r.value}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${r.color}`} style={{ width: `${r.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per course stats */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            Statistik Per Kursus
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {courses.map(c => {
            const gradedSubs = c.assignments.flatMap(a => a.submissions)
            const avgAssignment = gradedSubs.length > 0
              ? Math.round(gradedSubs.reduce((s, sub) => {
                  const a = c.assignments.find(a => a.submissions.some(ss => ss.id === sub.id))
                  return s + ((sub.score ?? 0) / (a?.maxScore ?? 100)) * 100
                }, 0) / gradedSubs.length)
              : null

            const allAttempts = c.quizzes.flatMap(q => q.attempts)
            const attendPct = c.attendanceSessions.length > 0 && c.enrollments.length > 0
              ? Math.round((c.attendanceSessions.reduce((s, sess) => s + sess._count.records, 0)) / (c.attendanceSessions.length * c.enrollments.length) * 100)
              : null

            return (
              <div key={c.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{c.code}</span>
                    </div>
                    <p className="font-medium text-gray-900 truncate">{c.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.lecturer.name} · {c.enrollments.length} pelajar</p>
                  </div>
                  <div className="flex items-center gap-6 text-center flex-shrink-0">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{avgAssignment !== null ? `${avgAssignment}%` : '—'}</p>
                      <p className="text-xs text-gray-400">Avg Tugasan</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{allAttempts.length}</p>
                      <p className="text-xs text-gray-400">Cubaan Kuiz</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{attendPct !== null ? `${attendPct}%` : '—'}</p>
                      <p className="text-xs text-gray-400">Kehadiran</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BookMarked,
  Users,
  FileText,
  CalendarCheck,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

async function getLecturerData(lecturerId: string) {
  const courses = await prisma.course.findMany({
    where: { lecturerId },
    include: {
      enrollments: true,
      assignments: {
        include: { submissions: true },
      },
      attendanceSessions: {
        orderBy: { date: 'desc' },
        take: 3,
      },
    },
  })

  const pendingGrading = courses.flatMap((c) =>
    c.assignments.flatMap((a) =>
      a.submissions.filter((s) => s.status === 'SUBMITTED').map((s) => ({
        assignmentTitle: a.title,
        courseCode: c.code,
        courseId: c.id,
        assignmentId: a.id,
        submittedAt: s.submittedAt,
      }))
    )
  )

  return { courses, pendingGrading }
}

export default async function LecturerDashboard() {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const { courses, pendingGrading } = await getLecturerData(session.userId)

  const totalStudents = courses.reduce((sum, c) => sum + c.enrollments.length, 0)
  const totalAssignments = courses.reduce((sum, c) => sum + c.assignments.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Selamat Datang, {session.name.split(' ')[0]}</h2>
        <p className="text-gray-500 text-sm mt-1">Semester 2 — Sesi Akademik 2025/2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Kursus Diajar', value: courses.length, icon: <BookMarked className="w-5 h-5" />, bg: 'bg-green-50', icon_bg: 'bg-green-100', text: 'text-green-700' },
          { label: 'Jumlah Pelajar', value: totalStudents, icon: <Users className="w-5 h-5" />, bg: 'bg-blue-50', icon_bg: 'bg-blue-100', text: 'text-blue-700' },
          { label: 'Tugasan Dicipta', value: totalAssignments, icon: <FileText className="w-5 h-5" />, bg: 'bg-orange-50', icon_bg: 'bg-orange-100', text: 'text-orange-700' },
          { label: 'Perlu Semak', value: pendingGrading.length, icon: <AlertCircle className="w-5 h-5" />, bg: 'bg-red-50', icon_bg: 'bg-red-100', text: 'text-red-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={`w-10 h-10 ${s.icon_bg} rounded-xl flex items-center justify-center ${s.text}`}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Courses */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-gray-900">Kursus Saya</h3>
          {courses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              Tiada kursus ditemui
            </div>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                        {course.code}
                      </span>
                      <span className="text-xs text-gray-400">{course.semester}</span>
                    </div>
                    <h4 className="font-semibold text-gray-900">{course.title}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-gray-400" />
                    {course.enrollments.length} pelajar
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-gray-400" />
                    {course.assignments.length} tugasan
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-gray-400" />
                    {course.attendanceSessions.length} sesi
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/dashboard/lecturer/courses/${course.id}`}
                    className="flex-1 text-center text-sm bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 transition font-medium"
                  >
                    Urus Kursus
                  </Link>
                  <Link
                    href={`/dashboard/lecturer/courses/${course.id}#attendance`}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition flex items-center gap-2"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    Kehadiran
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pending grading + upcoming */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Tugasan Perlu Disemak
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingGrading.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Semua telah disemak!</p>
                </div>
              ) : (
                pendingGrading.slice(0, 4).map((item, i) => (
                  <Link key={i} href={`/dashboard/lecturer/courses/${item.courseId}/assignments/${item.assignmentId}`} className="px-5 py-3.5 block hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-800">{item.assignmentTitle}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-green-700 font-medium">{item.courseCode}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.submittedAt).toLocaleDateString('ms-MY')}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Tindakan Pantas</h3>
            </div>
            <div className="p-3 space-y-2">
              {[
                { label: 'Semua Tugasan', icon: <FileText className="w-4 h-4" />, href: '/dashboard/lecturer/assignments', color: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200' },
                { label: 'Semua Kuiz', icon: <ClipboardList className="w-4 h-4" />, href: '/dashboard/lecturer/quizzes', color: 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200' },
                { label: 'Rekod Kehadiran', icon: <CalendarCheck className="w-4 h-4" />, href: '/dashboard/lecturer/attendance', color: 'hover:bg-green-50 hover:text-green-700 hover:border-green-200' },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-100 text-sm text-gray-600 transition-all ${a.color}`}
                >
                  {a.icon}
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

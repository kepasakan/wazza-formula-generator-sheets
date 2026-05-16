import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import {
  BookMarked,
  FileText,
  ClipboardList,
  CalendarCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  ChevronRight,
} from 'lucide-react'

async function getStudentData(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      course: {
        include: {
          lecturer: { select: { name: true } },
          modules: { where: { isPublished: true } },
          assignments: {
            where: { isPublished: true },
            include: {
              submissions: { where: { studentId } },
            },
          },
          quizzes: {
            where: { isPublished: true },
            include: {
              attempts: { where: { studentId } },
            },
          },
          attendanceSessions: {
            orderBy: { date: 'desc' },
            take: 3,
            include: {
              records: { where: { studentId } },
            },
          },
        },
      },
    },
  })

  const upcomingAssignments = enrollments
    .flatMap((e) =>
      e.course.assignments
        .filter((a) => {
          const hasSubmitted = a.submissions.length > 0
          return !hasSubmitted && new Date(a.dueDate) > new Date()
        })
        .map((a) => ({
          title: a.title,
          courseCode: e.course.code,
          courseTitle: e.course.title,
          courseId: e.course.id,
          dueDate: a.dueDate,
          id: a.id,
        }))
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  const recentAttendance = enrollments.flatMap((e) =>
    e.course.attendanceSessions.map((s) => ({
      sessionTitle: s.title,
      courseCode: e.course.code,
      date: s.date,
      status: s.records[0]?.status ?? null,
      isOpen: s.isOpen,
    }))
  )

  return { enrollments, upcomingAssignments, recentAttendance }
}

const attendanceBadge = {
  PRESENT: 'bg-green-100 text-green-700',
  ABSENT: 'bg-red-100 text-red-700',
  LATE: 'bg-yellow-100 text-yellow-700',
  EXCUSED: 'bg-blue-100 text-blue-700',
}

const attendanceLabel = {
  PRESENT: 'Hadir',
  ABSENT: 'Tidak Hadir',
  LATE: 'Lewat',
  EXCUSED: 'Dikecualikan',
}

export default async function StudentDashboard() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const [{ enrollments, upcomingAssignments, recentAttendance }, latestAnnouncement] = await Promise.all([
    getStudentData(session.userId),
    prisma.announcement.findFirst({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, content: true, imageUrl: true, createdAt: true },
    }),
  ])

  return (
    <div className="space-y-6">
      {latestAnnouncement && (
        <AnnouncementBanner
          announcement={{ ...latestAnnouncement, createdAt: latestAnnouncement.createdAt.toISOString(), imageUrl: latestAnnouncement.imageUrl ?? null }}
          readHref={`/dashboard/student/announcements/${latestAnnouncement.id}`}
          userId={session.userId}
        />
      )}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Selamat Datang, {session.name.split(' ')[0]}</h2>
        <p className="text-gray-500 text-sm mt-1">Semester 2 — Sesi Akademik 2025/2026</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Kursus Didaftar', value: enrollments.length, icon: <BookMarked className="w-5 h-5" />, icon_bg: 'bg-green-100', text: 'text-green-700' },
          { label: 'Tugasan Tertunggak', value: upcomingAssignments.length, icon: <AlertCircle className="w-5 h-5" />, icon_bg: 'bg-orange-100', text: 'text-orange-700' },
          { label: 'Kuiz Tersedia', value: enrollments.flatMap(e => e.course.quizzes.filter(q => q.attempts.length === 0)).length, icon: <ClipboardList className="w-5 h-5" />, icon_bg: 'bg-purple-100', text: 'text-purple-700' },
          { label: 'Sesi Kehadiran', value: recentAttendance.length, icon: <CalendarCheck className="w-5 h-5" />, icon_bg: 'bg-blue-100', text: 'text-blue-700' },
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
        {/* Courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Kursus Saya</h3>
            <Link href="/dashboard/student/courses" className="text-sm text-green-700 hover:underline flex items-center gap-1">
              Lihat semua <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {enrollments.map(({ course }) => (
            <div key={course.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      {course.code}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mt-0.5">{course.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Pensyarah: {course.lecturer.name}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <PlayCircle className="w-3.5 h-3.5" />
                  {course.modules.length} modul
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {course.assignments.length} tugasan
                </span>
                <span className="flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" />
                  {course.quizzes.length} kuiz
                </span>
              </div>

              <div className="mt-4">
                <Link
                  href={`/dashboard/student/courses/${course.id}`}
                  className="block text-center text-sm bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 transition font-medium"
                >
                  Masuk Kursus
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Upcoming assignments */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Tugasan Akan Datang
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingAssignments.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Tiada tugasan tertunggak</p>
                </div>
              ) : (
                upcomingAssignments.slice(0, 4).map((a) => {
                  const daysLeft = Math.ceil(
                    (new Date(a.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                  return (
                    <Link key={a.id} href={`/dashboard/student/courses/${a.courseId}`} className="px-5 py-3.5 block hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-800">{a.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-green-700 font-medium">{a.courseCode}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${daysLeft <= 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                          {daysLeft} hari lagi
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>

          {/* Recent attendance */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-blue-500" />
                Kehadiran Terkini
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {recentAttendance.slice(0, 4).map((a, i) => (
                <Link key={i} href="/dashboard/student/attendance" className="px-5 py-3.5 block hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.sessionTitle}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{a.courseCode}</span>
                    {a.isOpen && !a.status ? (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
                        Buka Sekarang
                      </span>
                    ) : a.status ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${attendanceBadge[a.status as keyof typeof attendanceBadge]}`}>
                        {attendanceLabel[a.status as keyof typeof attendanceLabel]}
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Tiada rekod
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

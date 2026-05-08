import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  BookMarked,
  FileText,
  ClipboardList,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  Play,
  AlignLeft,
  Link2,
} from 'lucide-react'
import AssignmentSection from './AssignmentSection'
import AttendanceSection from './AttendanceSection'

export default async function StudentCoursePage(props: PageProps<'/dashboard/student/courses/[courseId]'>) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const { courseId } = await props.params

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: session.userId, courseId } },
    include: {
      course: {
        include: {
          lecturer: { select: { name: true, email: true } },
          modules: {
            where: { isPublished: true },
            orderBy: { orderIndex: 'asc' },
            include: {
              contents: { orderBy: { orderIndex: 'asc' } },
            },
          },
          assignments: {
            include: { submissions: { where: { studentId: session.userId } } },
          },
          quizzes: {
            where: { isPublished: true },
            include: { attempts: { where: { studentId: session.userId } } },
          },
          enrollments: true,
          attendanceSessions: {
            orderBy: { date: 'desc' },
            include: {
              records: { where: { studentId: session.userId }, select: { status: true } },
            },
          },
        },
      },
    },
  })

  if (!enrollment) notFound()

  const { course } = enrollment

  // Check for active attendance session
  const activeAttendanceSession = await prisma.attendanceSession.findFirst({
    where: {
      courseId,
      isOpen: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true, title: true, expiresAt: true },
  })

  const alreadyMarked = activeAttendanceSession
    ? !!(await prisma.attendanceRecord.findUnique({
        where: {
          sessionId_studentId: {
            sessionId: activeAttendanceSession.id,
            studentId: session.userId,
          },
        },
      }))
    : false

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/student/courses" className="hover:text-gray-900">Kursus</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{course.code}</span>
      </div>

      {/* Course header */}
      <div className="bg-gradient-to-r from-green-800 to-emerald-700 rounded-2xl p-6 text-white">
        <Link href="/dashboard" className="text-green-200 text-sm flex items-center gap-1 mb-4 hover:text-white">
          <ChevronLeft className="w-4 h-4" /> Kembali
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookMarked className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">{course.code}</span>
            <h2 className="text-2xl font-bold mt-2">{course.title}</h2>
            <p className="text-green-200 text-sm mt-1">{course.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-green-200">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {course.enrollments.length} pelajar
              </span>
              <span>•</span>
              <span>{course.semester} {course.year}</span>
              <span>•</span>
              <span>Pensyarah: {course.lecturer.name}</span>
            </div>
          </div>
        </div>

        {/* Course stats */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Modul', value: course.modules.length, icon: <BookMarked className="w-4 h-4" /> },
            { label: 'Tugasan', value: course.assignments.length, icon: <FileText className="w-4 h-4" /> },
            { label: 'Kuiz', value: course.quizzes.length, icon: <ClipboardList className="w-4 h-4" /> },
            { label: 'Tugasan Selesai', value: course.assignments.filter(a => a.submissions.length > 0).length, icon: <CalendarCheck className="w-4 h-4" /> },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="flex justify-center mb-1">{s.icon}</div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-green-200">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modules */}
      <div>
        <h3 className="font-semibold text-gray-900 text-lg mb-4">Kandungan Kursus</h3>
        {course.modules.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            Kandungan belum tersedia
          </div>
        ) : (
          <div className="space-y-3">
            {course.modules.map((module, idx) => {
              const contentSummary = [
                module.contents.filter((c) => c.type === 'VIDEO').length > 0 && { icon: <Play className="w-3 h-3" />, label: `${module.contents.filter((c) => c.type === 'VIDEO').length} Video`, color: 'bg-red-50 text-red-600' },
                module.contents.filter((c) => c.type === 'PDF').length > 0 && { icon: <FileText className="w-3 h-3" />, label: `${module.contents.filter((c) => c.type === 'PDF').length} PDF`, color: 'bg-blue-50 text-blue-600' },
                module.contents.filter((c) => c.type === 'TEXT').length > 0 && { icon: <AlignLeft className="w-3 h-3" />, label: `${module.contents.filter((c) => c.type === 'TEXT').length} Nota`, color: 'bg-amber-50 text-amber-600' },
                module.contents.filter((c) => c.type === 'LINK').length > 0 && { icon: <Link2 className="w-3 h-3" />, label: `${module.contents.filter((c) => c.type === 'LINK').length} Pautan`, color: 'bg-purple-50 text-purple-600' },
              ].filter(Boolean) as { icon: React.ReactNode; label: string; color: string }[]

              return (
                <Link
                  key={module.id}
                  href={`/dashboard/student/courses/${courseId}/modules/${module.id}`}
                  className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-green-300 hover:shadow-sm transition-all group"
                >
                  <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 group-hover:text-green-800 transition-colors">
                      {module.title}
                    </h4>
                    {module.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{module.description}</p>
                    )}
                    {contentSummary.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {contentSummary.map((s, i) => (
                          <span key={i} className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                            {s.icon}
                            {s.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {module.contents.length === 0 && (
                      <span className="text-xs text-gray-400">Tiada kandungan</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-600 transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Assignments */}
      {course.assignments.length > 0 && (
        <AssignmentSection
          assignments={course.assignments.map((a) => ({
            id: a.id,
            title: a.title,
            description: a.description ?? null,
            dueDate: a.dueDate.toISOString(),
            maxScore: a.maxScore,
            submissions: a.submissions.map((s) => ({
              id: s.id,
              status: s.status as 'SUBMITTED' | 'GRADED' | 'LATE',
              score: s.score ?? null,
              feedback: s.feedback ?? null,
              submittedAt: s.submittedAt.toISOString(),
              fileUrl: s.fileUrl ?? null,
              notes: s.notes ?? null,
            })),
          }))}
        />
      )}

      {/* Quizzes */}
      {course.quizzes.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-gray-500" />
            Kuiz
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {course.quizzes.map((quiz) => {
              const attempt = quiz.attempts[0]
              const isCompleted = attempt?.status === 'SUBMITTED'
              const isAvailable =
                (!quiz.startTime || new Date(quiz.startTime) <= new Date()) &&
                (!quiz.endTime || new Date(quiz.endTime) > new Date())

              return (
                <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{quiz.title}</h4>
                      <p className="text-sm text-gray-500 mt-0.5">{quiz.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {quiz.duration} minit
                        </span>
                        {quiz.startTime && (
                          <span>
                            Mula: {new Date(quiz.startTime).toLocaleDateString('ms-MY', { dateStyle: 'short' })}
                            {' '}{new Date(quiz.startTime).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {quiz.endTime && (
                          <span>
                            Tamat: {new Date(quiz.endTime).toLocaleDateString('ms-MY', { dateStyle: 'short' })}
                            {' '}{new Date(quiz.endTime).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {isCompleted ? (
                      <Link
                        href={`/dashboard/student/courses/${courseId}/quiz/${quiz.id}`}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium flex-shrink-0 hover:bg-green-200 transition"
                      >
                        ✓ {attempt.score} markah — Semak
                      </Link>
                    ) : isAvailable ? (
                      <Link
                        href={`/dashboard/student/courses/${courseId}/quiz/${quiz.id}`}
                        className="flex-shrink-0 text-sm bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800 transition font-medium"
                      >
                        Mula Kuiz
                      </Link>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex-shrink-0">Belum dibuka</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Attendance */}
      <AttendanceSection
        courseId={courseId}
        initialActive={
          activeAttendanceSession
            ? {
                id: activeAttendanceSession.id,
                title: activeAttendanceSession.title,
                expiresAt: activeAttendanceSession.expiresAt?.toISOString() ?? null,
                alreadyMarked,
              }
            : null
        }
        initialHistory={course.attendanceSessions.map((s) => ({
          id: s.id,
          title: s.title,
          date: s.date.toISOString(),
          status: (s.records[0]?.status ?? null) as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null,
        }))}
      />
    </div>
  )
}

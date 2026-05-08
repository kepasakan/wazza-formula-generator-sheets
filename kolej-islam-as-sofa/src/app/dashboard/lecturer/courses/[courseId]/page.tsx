import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, BookOpen, FileText, ClipboardList, CalendarCheck } from 'lucide-react'
import ModuleManager from './ModuleManager'
import AssignmentManager from './AssignmentManager'
import QuizManager from './QuizManager'
import AttendanceManager from './AttendanceManager'

async function getCourse(courseId: string, lecturerId: string) {
  return prisma.course.findFirst({
    where: { id: courseId, lecturerId },
    include: {
      enrollments: { include: { student: { select: { id: true, name: true, matricNo: true } } } },
      modules: {
        include: { contents: { orderBy: { orderIndex: 'asc' } } },
        orderBy: { orderIndex: 'asc' },
      },
      assignments: {
        include: {
          submissions: { select: { id: true, status: true } },
        },
        orderBy: { dueDate: 'asc' },
      },
      quizzes: {
        include: { _count: { select: { questions: true, attempts: true } } },
        orderBy: { createdAt: 'desc' },
      },
      attendanceSessions: {
        include: {
          records: { include: { student: { select: { id: true, name: true, matricNo: true } } } },
          _count: { select: { records: true } },
        },
        orderBy: { date: 'desc' },
      },
    },
  })
}

export default async function LecturerCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const { courseId } = await params
  const course = await getCourse(courseId, session.userId)
  if (!course) notFound()

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/dashboard/lecturer"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                {course.code}
              </span>
              <span className="text-xs text-gray-400">
                {course.semester} — {course.year}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{course.title}</h2>
            {course.description && (
              <p className="text-gray-500 text-sm mt-1">{course.description}</p>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-gray-400" />
            {course.enrollments.length} pelajar
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-gray-400" />
            {course.modules.length} modul
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-gray-400" />
            {course.assignments.length} tugasan
          </span>
          <span className="flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            {course.quizzes.length} kuiz
          </span>
        </div>
      </div>

      {/* Enrolled students */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">
            Senarai Pelajar
            <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {course.enrollments.length}
            </span>
          </h3>
        </div>
        {course.enrollments.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">Tiada pelajar berdaftar</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {course.enrollments.map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-700 text-xs font-semibold">
                    {e.student.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{e.student.name}</p>
                  {e.student.matricNo && (
                    <p className="text-xs text-gray-400">{e.student.matricNo}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Module Manager */}
      <ModuleManager
        courseId={course.id}
        initialModules={course.modules.map((m) => ({
          ...m,
          description: m.description ?? null,
          contents: m.contents.map((c) => ({
            ...c,
            contentUrl: c.contentUrl ?? null,
            youtubeId: c.youtubeId ?? null,
            textContent: c.textContent ?? null,
          })),
        }))}
      />

      {/* Assignments section */}
      <AssignmentManager
        courseId={course.id}
        totalEnrolled={course.enrollments.length}
        initialAssignments={course.assignments.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description ?? null,
          dueDate: a.dueDate.toISOString(),
          maxScore: a.maxScore,
          submissions: a.submissions.map((s) => ({ id: s.id, status: s.status })),
        }))}
      />

      {/* Quiz manager */}
      <QuizManager
        courseId={course.id}
        initialQuizzes={course.quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          description: q.description ?? null,
          duration: q.duration,
          isPublished: q.isPublished,
          startTime: q.startTime?.toISOString() ?? null,
          endTime: q.endTime?.toISOString() ?? null,
          _count: q._count,
        }))}
      />

      {/* Attendance manager */}
      <AttendanceManager
        courseId={course.id}
        totalEnrolled={course.enrollments.length}
        enrolledStudents={course.enrollments.map(e => ({
          id: e.student.id,
          name: e.student.name,
          matricNo: e.student.matricNo ?? null,
        }))}
        initialSessions={course.attendanceSessions.map((s) => ({
          id: s.id,
          title: s.title,
          date: s.date.toISOString(),
          code: s.code,
          isOpen: s.isOpen,
          expiresAt: s.expiresAt?.toISOString() ?? null,
          records: s.records.map((r) => ({
            id: r.id,
            student: r.student,
            markedAt: r.markedAt.toISOString(),
            status: r.status,
          })),
          _count: s._count,
        }))}
      />
    </div>
  )
}

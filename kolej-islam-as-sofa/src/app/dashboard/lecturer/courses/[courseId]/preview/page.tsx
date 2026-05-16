import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  BookMarked, FileText, ClipboardList, CalendarCheck,
  ChevronLeft, ChevronRight, Users, Clock,
  Play, AlignLeft, Link2, Eye, ArrowLeft,
} from 'lucide-react'

export default async function LecturerCoursePreviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const { courseId } = await params

  const course = await prisma.course.findFirst({
    where: { id: courseId, lecturerId: session.userId },
    include: {
      lecturer: { select: { name: true } },
      enrollments: true,
      modules: {
        where: { isPublished: true },
        orderBy: { orderIndex: 'asc' },
        include: { contents: { orderBy: { orderIndex: 'asc' } } },
      },
      assignments: {
        where: { isPublished: true },
        orderBy: { dueDate: 'asc' },
      },
      quizzes: {
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!course) notFound()

  return (
    <div className="space-y-6">
      {/* Preview banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Eye className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Mod Pratonton Pandangan Pelajar</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Ini adalah paparan seperti yang dilihat oleh pelajar. Kandungan tersembunyi (Draf) tidak dipaparkan.
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/lecturer/courses/${courseId}`}
          className="flex-shrink-0 flex items-center gap-1.5 text-sm text-amber-700 font-medium hover:text-amber-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Urus Kursus
        </Link>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{course.code}</span>
        <span>/</span>
        <span className="text-amber-600 font-medium">Pratonton</span>
      </div>

      {/* Course header — same as student view */}
      <div className="bg-gradient-to-r from-green-800 to-emerald-700 rounded-2xl p-6 text-white">
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

        <div className="grid grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Modul', value: course.modules.length, icon: <BookMarked className="w-4 h-4" /> },
            { label: 'Tugasan', value: course.assignments.length, icon: <FileText className="w-4 h-4" /> },
            { label: 'Kuiz', value: course.quizzes.length, icon: <ClipboardList className="w-4 h-4" /> },
            { label: 'Kehadiran', value: 0, icon: <CalendarCheck className="w-4 h-4" /> },
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
            Kandungan belum tersedia (tiada modul yang disiarkan)
          </div>
        ) : (
          <div className="space-y-3">
            {course.modules.map((module, idx) => {
              const contentSummary = [
                module.contents.filter((c) => c.type === 'VIDEO').length > 0 && {
                  icon: <Play className="w-3 h-3" />,
                  label: `${module.contents.filter((c) => c.type === 'VIDEO').length} Video`,
                  color: 'bg-red-50 text-red-600',
                },
                module.contents.filter((c) => c.type === 'PDF').length > 0 && {
                  icon: <FileText className="w-3 h-3" />,
                  label: `${module.contents.filter((c) => c.type === 'PDF').length} PDF`,
                  color: 'bg-blue-50 text-blue-600',
                },
                module.contents.filter((c) => c.type === 'TEXT').length > 0 && {
                  icon: <AlignLeft className="w-3 h-3" />,
                  label: `${module.contents.filter((c) => c.type === 'TEXT').length} Nota`,
                  color: 'bg-amber-50 text-amber-600',
                },
                module.contents.filter((c) => c.type === 'LINK').length > 0 && {
                  icon: <Link2 className="w-3 h-3" />,
                  label: `${module.contents.filter((c) => c.type === 'LINK').length} Pautan`,
                  color: 'bg-purple-50 text-purple-600',
                },
              ].filter(Boolean) as { icon: React.ReactNode; label: string; color: string }[]

              return (
                <div
                  key={module.id}
                  className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 px-5 py-4 opacity-90"
                >
                  <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">{module.title}</h4>
                    {module.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {module.description.replace(/<[^>]+>/g, ' ').trim()}
                      </p>
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
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assignments */}
      {course.assignments.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            Tugasan
          </h3>
          <div className="space-y-3">
            {course.assignments.map((a) => {
              const isOverdue = new Date() > new Date(a.dueDate)
              const daysLeft = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{a.title}</h4>
                      {a.description && (
                        <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Tarikh akhir: {new Date(a.dueDate).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                        </span>
                        <span>Markah: {a.maxScore}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isOverdue ? (
                        <span className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-full font-medium">Tamat</span>
                      ) : (
                        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${daysLeft <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                          {daysLeft} hari lagi
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400 italic">
                      [Butang hantar tugasan akan dipaparkan di sini untuk pelajar]
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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
              const isAvailable =
                (!quiz.startTime || new Date(quiz.startTime) <= new Date()) &&
                (!quiz.endTime || new Date(quiz.endTime) > new Date())
              return (
                <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{quiz.title}</h4>
                      {quiz.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{quiz.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {quiz.duration} minit
                        </span>
                        {quiz.startTime && (
                          <span>
                            Mula: {new Date(quiz.startTime).toLocaleDateString('ms-MY', { dateStyle: 'short' })}
                          </span>
                        )}
                        {quiz.endTime && (
                          <span>
                            Tamat: {new Date(quiz.endTime).toLocaleDateString('ms-MY', { dateStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {isAvailable ? (
                      <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full font-medium flex-shrink-0">
                        Dibuka
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex-shrink-0">
                        Belum dibuka
                      </span>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400 italic">
                      [Butang mula kuiz akan dipaparkan di sini untuk pelajar]
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Attendance placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2 mb-2">
          <CalendarCheck className="w-4 h-4 text-blue-500" />
          Rekod Kehadiran
        </h3>
        <p className="text-xs text-gray-400 italic">
          [Seksyen kehadiran pelajar dan rekod hadir/tidak hadir dipaparkan di sini]
        </p>
      </div>
    </div>
  )
}

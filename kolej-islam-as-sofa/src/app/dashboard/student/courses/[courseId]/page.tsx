import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  BookMarked,
  FileText,
  ClipboardList,
  CalendarCheck,
  PlayCircle,
  FileTextIcon,
  LinkIcon,
  AlignLeft,
  ChevronLeft,
  Users,
  Clock,
} from 'lucide-react'

const contentTypeIcon = {
  VIDEO: <PlayCircle className="w-4 h-4 text-red-500" />,
  PDF: <FileTextIcon className="w-4 h-4 text-orange-500" />,
  TEXT: <AlignLeft className="w-4 h-4 text-blue-500" />,
  LINK: <LinkIcon className="w-4 h-4 text-purple-500" />,
}

const contentTypeBadge = {
  VIDEO: 'bg-red-50 text-red-700',
  PDF: 'bg-orange-50 text-orange-700',
  TEXT: 'bg-blue-50 text-blue-700',
  LINK: 'bg-purple-50 text-purple-700',
}

const contentTypeLabel = { VIDEO: 'Video', PDF: 'PDF', TEXT: 'Nota', LINK: 'Pautan' }

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
        },
      },
    },
  })

  if (!enrollment) notFound()

  const { course } = enrollment

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
        <div className="space-y-3">
          {course.modules.map((module, idx) => (
            <div key={module.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{module.title}</h4>
                    {module.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{module.description}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400">{module.contents.length} kandungan</span>
              </div>

              {module.contents.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {module.contents.map((content) => (
                    <div key={content.id} className="px-5 py-3.5">
                      {content.type === 'VIDEO' && content.youtubeId ? (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            {contentTypeIcon[content.type]}
                            <span className="text-sm font-medium text-gray-800">{content.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${contentTypeBadge[content.type]}`}>
                              {contentTypeLabel[content.type]}
                            </span>
                          </div>
                          <div className="aspect-video w-full max-w-2xl rounded-xl overflow-hidden bg-black">
                            <iframe
                              src={`https://www.youtube.com/embed/${content.youtubeId}`}
                              title={content.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                      ) : content.type === 'TEXT' && content.textContent ? (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            {contentTypeIcon[content.type]}
                            <span className="text-sm font-medium text-gray-800">{content.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${contentTypeBadge[content.type]}`}>
                              {contentTypeLabel[content.type]}
                            </span>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none whitespace-pre-line">
                            {content.textContent}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {contentTypeIcon[content.type]}
                          <span className="text-sm font-medium text-gray-800 flex-1">{content.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${contentTypeBadge[content.type as keyof typeof contentTypeBadge]}`}>
                            {contentTypeLabel[content.type as keyof typeof contentTypeLabel]}
                          </span>
                          {content.contentUrl && (
                            <a
                              href={content.contentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 transition"
                            >
                              Buka
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Assignments */}
      {course.assignments.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            Tugasan
          </h3>
          <div className="space-y-3">
            {course.assignments.map((assignment) => {
              const submitted = assignment.submissions.length > 0
              const submission = assignment.submissions[0]
              const isOverdue = new Date(assignment.dueDate) < new Date() && !submitted
              const daysLeft = Math.ceil((new Date(assignment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

              return (
                <div key={assignment.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{assignment.title}</h4>
                        {submitted ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            submission?.status === 'GRADED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {submission?.status === 'GRADED' ? `✓ Dinilai: ${submission.score}/${assignment.maxScore}` : '✓ Dihantar'}
                          </span>
                        ) : isOverdue ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Tamat Tempoh</span>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${daysLeft <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                            {daysLeft > 0 ? `${daysLeft} hari lagi` : 'Hari ini'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{assignment.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(assignment.dueDate).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                        </span>
                        <span>Markah penuh: {assignment.maxScore}</span>
                      </div>
                      {submission?.feedback && (
                        <div className="mt-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm text-green-800">
                          <span className="font-medium">Maklum balas:</span> {submission.feedback}
                        </div>
                      )}
                    </div>
                    {!submitted && !isOverdue && (
                      <button className="flex-shrink-0 text-sm bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition font-medium">
                        Hantar
                      </button>
                    )}
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
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {quiz.duration} minit
                        </span>
                      </div>
                    </div>
                    {isCompleted ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex-shrink-0">
                        Selesai: {attempt.score} markah
                      </span>
                    ) : isAvailable ? (
                      <button className="flex-shrink-0 text-sm bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800 transition font-medium">
                        Mula Kuiz
                      </button>
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
    </div>
  )
}

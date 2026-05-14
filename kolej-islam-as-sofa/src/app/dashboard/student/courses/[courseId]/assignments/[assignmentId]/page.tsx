import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Hash, AlertCircle } from 'lucide-react'
import AssignmentSubmitForm from './AssignmentSubmitForm'

export default async function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const { courseId, assignmentId } = await params

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: session.userId, courseId } },
    include: { course: { select: { code: true, title: true } } },
  })
  if (!enrollment) notFound()

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, courseId },
  })
  if (!assignment) notFound()

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: session.userId } },
  })

  const now = new Date()
  const dueDate = new Date(assignment.dueDate)
  const isOverdue = now > dueDate
  const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)
  const hoursLeft = Math.ceil((dueDate.getTime() - now.getTime()) / 3600000)

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href={`/dashboard/student/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {enrollment.course.code} — {enrollment.course.title}
        </Link>
      </div>

      {/* Assignment header */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{assignment.title}</h2>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${
              isOverdue
                ? 'bg-red-50 text-red-700'
                : daysLeft <= 1
                ? 'bg-orange-50 text-orange-700'
                : 'bg-gray-50 text-gray-700'
            }`}>
              <Clock className="w-4 h-4" />
              {isOverdue ? (
                'Tamat Tempoh'
              ) : daysLeft <= 1 ? (
                `${hoursLeft} jam lagi`
              ) : (
                `${daysLeft} hari lagi`
              )}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 text-gray-700 font-medium">
              <Hash className="w-4 h-4" />
              {assignment.maxScore} markah
            </div>
            <div className="text-xs text-gray-400">
              Tarikh akhir: {dueDate.toLocaleDateString('ms-MY', { dateStyle: 'full' })}
              {' — '}
              {dueDate.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Description */}
        {assignment.description && (
          <div className="border-t border-gray-100 px-6 py-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Arahan Tugasan
            </h3>
            <div
              className="rich-content text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: assignment.description }}
            />
          </div>
        )}

        {/* Overdue alert */}
        {isOverdue && !submission && (
          <div className="border-t border-red-100 bg-red-50 px-6 py-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              Tempoh penghantaran tugasan ini telah tamat.
            </p>
          </div>
        )}
      </div>

      {/* Submit section */}
      <AssignmentSubmitForm
        assignmentId={assignmentId}
        maxScore={assignment.maxScore}
        isOverdue={isOverdue}
        existingSubmission={
          submission
            ? {
                id: submission.id,
                status: submission.status,
                score: submission.score ?? null,
                feedback: submission.feedback ?? null,
                submittedAt: submission.submittedAt.toISOString(),
                fileUrl: submission.fileUrl ?? null,
                notes: submission.notes ?? null,
              }
            : null
        }
      />
    </div>
  )
}

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EditAssignmentForm from './EditAssignmentForm'

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const { courseId, assignmentId } = await params

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, courseId, course: { lecturerId: session.userId } },
    include: { course: { select: { code: true, title: true } } },
  })
  if (!assignment) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/lecturer/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {assignment.course.code} — {assignment.course.title}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Edit Tugasan</h2>
        <p className="text-gray-500 text-sm mt-1">Kemaskini butiran tugasan</p>
      </div>

      <EditAssignmentForm
        courseId={courseId}
        assignment={{
          id: assignment.id,
          title: assignment.title,
          description: assignment.description ?? null,
          dueDate: assignment.dueDate.toISOString(),
          maxScore: assignment.maxScore,
        }}
      />
    </div>
  )
}

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CreateAssignmentForm from './CreateAssignmentForm'

export default async function CreateAssignmentPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const { courseId } = await params

  const course = await prisma.course.findFirst({
    where: { id: courseId, lecturerId: session.userId },
    select: { id: true, code: true, title: true },
  })
  if (!course) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/lecturer/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {course.code} — {course.title}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Cipta Tugasan Baru</h2>
        <p className="text-gray-500 text-sm mt-1">Isi butiran tugasan untuk pelajar</p>
      </div>

      <CreateAssignmentForm courseId={courseId} />
    </div>
  )
}

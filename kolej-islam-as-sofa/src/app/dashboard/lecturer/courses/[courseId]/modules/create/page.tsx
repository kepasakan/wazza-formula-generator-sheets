import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import CreateModuleForm from './CreateModuleForm'

export default async function CreateModulePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const { courseId } = await params

  const course = await prisma.course.findFirst({
    where: { id: courseId, lecturerId: session.userId },
    include: { _count: { select: { modules: true } } },
  })
  if (!course) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/lecturer/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {course.code} — {course.title}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Modul Baharu</h2>
            <p className="text-gray-500 text-sm mt-0.5">Modul {course._count.modules + 1} dalam {course.code}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <CreateModuleForm courseId={courseId} moduleCount={course._count.modules} />
      </div>
    </div>
  )
}

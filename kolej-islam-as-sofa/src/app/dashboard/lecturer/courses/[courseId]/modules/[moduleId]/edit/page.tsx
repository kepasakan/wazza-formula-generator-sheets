import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import ModuleEditForm from './ModuleEditForm'

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const { courseId, moduleId } = await params

  const course = await prisma.course.findFirst({
    where: { id: courseId, lecturerId: session.userId },
    select: { code: true, title: true },
  })
  if (!course) notFound()

  const module = await prisma.module.findFirst({
    where: { id: moduleId, courseId },
    include: { contents: { orderBy: { orderIndex: 'asc' } } },
  })
  if (!module) notFound()

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
            <h2 className="text-2xl font-bold text-gray-900">Edit Modul</h2>
            <p className="text-gray-500 text-sm mt-0.5">{module.title}</p>
          </div>
        </div>
      </div>

      <ModuleEditForm
        courseId={courseId}
        module={{
          id: module.id,
          title: module.title,
          description: module.description ?? null,
          contents: module.contents.map((c) => ({
            id: c.id,
            type: c.type as 'VIDEO' | 'PDF' | 'TEXT' | 'LINK',
            title: c.title,
            contentUrl: c.contentUrl ?? null,
            youtubeId: c.youtubeId ?? null,
            textContent: c.textContent ?? null,
            orderIndex: c.orderIndex,
          })),
        }}
      />
    </div>
  )
}

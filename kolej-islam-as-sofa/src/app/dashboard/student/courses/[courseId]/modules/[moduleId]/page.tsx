import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Play, FileText, AlignLeft, Link2, BookOpen, Info } from 'lucide-react'

export default async function StudentModulePage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const { courseId, moduleId } = await params

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: session.userId, courseId } },
    include: { course: { select: { title: true, code: true } } },
  })
  if (!enrollment) notFound()

  const module = await prisma.module.findFirst({
    where: { id: moduleId, courseId, isPublished: true },
    include: {
      contents: { orderBy: { orderIndex: 'asc' } },
      course: {
        include: {
          modules: {
            where: { isPublished: true },
            orderBy: { orderIndex: 'asc' },
            select: { id: true, title: true },
          },
        },
      },
    },
  })
  if (!module) notFound()

  const allModules = module.course.modules
  const currentIdx = allModules.findIndex((m) => m.id === moduleId)
  const prevModule = currentIdx > 0 ? allModules[currentIdx - 1] : null
  const nextModule = currentIdx < allModules.length - 1 ? allModules[currentIdx + 1] : null

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb / back */}
      <div>
        <Link
          href={`/dashboard/student/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-5"
        >
          <ChevronLeft className="w-4 h-4" />
          {enrollment.course.code} — {enrollment.course.title}
        </Link>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-700 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {currentIdx + 1}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">
              Modul {currentIdx + 1} daripada {allModules.length}
            </p>
            <h2 className="text-2xl font-bold text-gray-900">{module.title}</h2>
            {module.description && (
              <p className="text-gray-500 text-sm mt-1">{module.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contents */}
      {module.contents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Tiada kandungan untuk modul ini</p>
        </div>
      ) : (
        <div className="space-y-5">
          {module.contents.map((content) => {
            if (content.type === 'VIDEO' && content.youtubeId) {
              return (
                <div key={content.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                      <Play className="w-3 h-3" /> Video
                    </span>
                    <span className="font-medium text-gray-900 text-sm">{content.title}</span>
                  </div>
                  <div className="aspect-video bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${content.youtubeId}`}
                      title={content.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                  {content.textContent && <Callout text={content.textContent} />}
                </div>
              )
            }

            if (content.type === 'PDF' && content.contentUrl) {
              return (
                <div key={content.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        <FileText className="w-3 h-3" /> PDF
                      </span>
                      <span className="font-medium text-gray-900 text-sm">{content.title}</span>
                    </div>
                    <a
                      href={content.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 transition flex-shrink-0"
                    >
                      Buka / Muat Turun
                    </a>
                  </div>
                  {content.textContent && <Callout text={content.textContent} />}
                  <div className="h-[600px] bg-gray-50">
                    <iframe src={content.contentUrl} title={content.title} className="w-full h-full" />
                  </div>
                </div>
              )
            }

            if (content.type === 'TEXT' && content.textContent) {
              return (
                <div key={content.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                      <AlignLeft className="w-3 h-3" /> Nota
                    </span>
                    <span className="font-medium text-gray-900 text-sm">{content.title}</span>
                  </div>
                  <div className="px-6 py-5">
                    <div
                      className="rich-content text-sm text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: content.textContent }}
                    />
                  </div>
                </div>
              )
            }

            if (content.type === 'LINK' && content.contentUrl) {
              return (
                <div key={content.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full flex-shrink-0">
                      <Link2 className="w-3 h-3" /> Pautan
                    </span>
                    <span className="flex-1 font-medium text-gray-900 text-sm">{content.title}</span>
                    <a
                      href={content.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800 transition font-medium flex-shrink-0"
                    >
                      Buka Pautan
                    </a>
                  </div>
                  {content.textContent && <Callout text={content.textContent} />}
                </div>
              )
            }

            return null
          })}
        </div>
      )}

      {/* Prev / Next navigation */}
      <div className="flex items-stretch justify-between gap-4 pt-4 border-t border-gray-200">
        {prevModule ? (
          <Link
            href={`/dashboard/student/courses/${courseId}/modules/${prevModule.id}`}
            className="flex items-center gap-3 bg-white border border-gray-200 px-4 py-3 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all flex-1 max-w-[48%]"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Sebelum</p>
              <p className="text-sm font-medium text-gray-900 truncate">{prevModule.title}</p>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {nextModule ? (
          <Link
            href={`/dashboard/student/courses/${courseId}/modules/${nextModule.id}`}
            className="flex items-center gap-3 bg-white border border-gray-200 px-4 py-3 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all flex-1 max-w-[48%] justify-end text-right ml-auto"
          >
            <div className="min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Seterusnya</p>
              <p className="text-sm font-medium text-gray-900 truncate">{nextModule.title}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}

function Callout({ text }: { text: string }) {
  return (
    <div className="mx-5 mb-4 mt-0 flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 leading-relaxed">{text}</p>
    </div>
  )
}

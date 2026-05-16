import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Mail, Phone, Hash } from 'lucide-react'

export default async function StudentsPage({
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
      enrollments: {
        include: {
          student: {
            select: { id: true, name: true, matricNo: true, email: true, phone: true },
          },
        },
        orderBy: { enrolledAt: 'asc' },
      },
    },
  })
  if (!course) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
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
            <Users className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Senarai Pelajar</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {course.enrollments.length} pelajar berdaftar dalam {course.code}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {course.enrollments.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Tiada pelajar berdaftar</p>
            <p className="text-sm text-gray-400 mt-1">Hubungi pentadbir untuk mendaftarkan pelajar</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {course.enrollments.map((e, idx) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-4">
                <span className="text-xs text-gray-300 font-bold w-5 text-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-700 text-sm font-semibold">
                    {e.student.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{e.student.name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {e.student.matricNo && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Hash className="w-3 h-3" />{e.student.matricNo}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Mail className="w-3 h-3" />{e.student.email}
                    </span>
                    {e.student.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone className="w-3 h-3" />{e.student.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0 text-right">
                  <p>Daftar masuk</p>
                  <p className="font-medium text-gray-600">
                    {new Date(e.enrolledAt).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

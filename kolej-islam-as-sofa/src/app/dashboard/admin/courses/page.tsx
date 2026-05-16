import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BookMarked, FileText, ClipboardList } from 'lucide-react'
import AddCoursePanel from './AddCoursePanel'
import EnrollmentManager from './EnrollmentManager'

export default async function AdminCoursesPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/dashboard')

  const [courses, lecturers, allStudents] = await Promise.all([
    prisma.course.findMany({
      include: {
        lecturer: { select: { name: true } },
        department: { select: { name: true, code: true } },
        enrollments: {
          include: { student: { select: { id: true, name: true, matricNo: true } } },
          orderBy: { enrolledAt: 'asc' },
        },
        assignments: true,
        quizzes: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: 'LECTURER' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, staffId: true },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, matricNo: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pengurusan Kursus</h2>
          <p className="text-gray-500 text-sm mt-1">
            {courses.length} kursus · {lecturers.length} pensyarah · {allStudents.length} pelajar
          </p>
        </div>
        <AddCoursePanel lecturers={lecturers} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {courses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <BookMarked className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Belum ada kursus. Klik &quot;Tambah Kursus&quot; untuk mula.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {courses.map(c => {
              const enrolledStudents = c.enrollments.map(e => e.student)
              return (
                <div key={c.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookMarked className="w-5 h-5 text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{c.code}</span>
                      <span className="text-xs text-gray-400">{c.semester} · {c.year}</span>
                      {c.department && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">{c.department.name}</span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 truncate">{c.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Pensyarah: {c.lecturer.name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />{c.assignments.length}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-gray-400" />{c.quizzes.length}
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${c.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.isPublished ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                  <EnrollmentManager
                    course={{ id: c.id, code: c.code, title: c.title, enrolledStudents }}
                    allStudents={allStudents}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

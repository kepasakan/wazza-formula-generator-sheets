import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react'
import GradingTable from './GradingTable'

export default async function AssignmentGradingPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') redirect('/dashboard')

  const { courseId, assignmentId } = await params

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, courseId, course: { lecturerId: session.userId } },
    include: {
      course: {
        include: {
          enrollments: {
            include: {
              student: { select: { id: true, name: true, matricNo: true } },
            },
          },
        },
      },
      submissions: true,
    },
  })
  if (!assignment) notFound()

  const submissionMap = new Map(assignment.submissions.map((s) => [s.studentId, s]))

  const students = assignment.course.enrollments.map((e) => {
    const sub = submissionMap.get(e.student.id) ?? null
    return {
      studentId: e.student.id,
      name: e.student.name,
      matricNo: e.student.matricNo ?? null,
      submission: sub
        ? {
            id: sub.id,
            status: sub.status as 'SUBMITTED' | 'GRADED' | 'LATE',
            score: sub.score ?? null,
            feedback: sub.feedback ?? null,
            submittedAt: sub.submittedAt.toISOString(),
            fileUrl: sub.fileUrl ?? null,
            notes: sub.notes ?? null,
          }
        : null,
    }
  })

  const totalEnrolled = students.length
  const totalSubmitted = students.filter((s) => s.submission).length
  const totalGraded = students.filter((s) => s.submission?.status === 'GRADED').length
  const totalPending = totalSubmitted - totalGraded
  const isOverdue = new Date() > new Date(assignment.dueDate)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <div>
        <Link
          href={`/dashboard/lecturer/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Kursus
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{assignment.title}</h2>
              {assignment.description && (
                <p className="text-gray-500 text-sm mt-1">{assignment.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Tarikh akhir:{' '}
                  {new Date(assignment.dueDate).toLocaleDateString('ms-MY', { dateStyle: 'long' })}
                </span>
                <span>Markah penuh: {assignment.maxScore}</span>
                {isOverdue && (
                  <span className="text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Sudah tamat tempoh
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Pelajar', value: totalEnrolled, color: 'text-gray-700', bg: 'bg-gray-50', icon: <Users className="w-4 h-4" /> },
              { label: 'Dihantar', value: totalSubmitted, color: 'text-blue-700', bg: 'bg-blue-50', icon: <CheckCircle className="w-4 h-4" /> },
              { label: 'Dinilai', value: totalGraded, color: 'text-green-700', bg: 'bg-green-50', icon: <CheckCircle className="w-4 h-4" /> },
              { label: 'Perlu Nilai', value: totalPending, color: 'text-orange-700', bg: 'bg-orange-50', icon: <AlertCircle className="w-4 h-4" /> },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className={`text-xs mt-0.5 ${s.color} opacity-70`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grading table */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">
          Senarai Submission
          {totalPending > 0 && (
            <span className="ml-2 text-xs font-normal text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              {totalPending} belum dinilai
            </span>
          )}
        </h3>
        {students.filter((s) => s.submission).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-sm">Tiada submission lagi</p>
          </div>
        ) : (
          <GradingTable students={students} maxScore={assignment.maxScore} />
        )}
      </div>
    </div>
  )
}

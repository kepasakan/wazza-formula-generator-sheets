import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, FileText, ClipboardList, CalendarCheck, ChevronRight, TrendingUp } from 'lucide-react'

export default async function StudentResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string; year?: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const { semester: qSemester, year: qYear } = await searchParams

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: session.userId },
    include: {
      course: {
        include: {
          department: { select: { name: true } },
          assignments: {
            include: { submissions: { where: { studentId: session.userId } } },
          },
          quizzes: {
            where: { isPublished: true },
            include: { attempts: { where: { studentId: session.userId, status: 'SUBMITTED' } } },
          },
          attendanceSessions: {
            include: { records: { where: { studentId: session.userId } } },
          },
          lecturer: { select: { name: true } },
        },
      },
    },
  })

  // Get distinct semesters
  const semesters = [...new Map(
    enrollments.map(e => [`${e.course.semester}-${e.course.year}`, { semester: e.course.semester, year: e.course.year }])
  ).values()].sort((a, b) => b.year.localeCompare(a.year) || b.semester.localeCompare(a.semester))

  const activeSemester = qSemester ?? semesters[0]?.semester
  const activeYear = qYear ?? semesters[0]?.year

  const filtered = enrollments.filter(
    e => e.course.semester === activeSemester && e.course.year === activeYear
  )

  // Compute per-course stats
  const courseStats = filtered.map(({ course }) => {
    const gradedSubs = course.assignments.flatMap(a => a.submissions.filter(s => s.status === 'GRADED'))
    const assignmentPct = gradedSubs.length > 0
      ? gradedSubs.reduce((sum, sub) => {
          const a = course.assignments.find(a => a.submissions.some(ss => ss.id === sub.id))
          return sum + ((sub.score ?? 0) / (a?.maxScore ?? 100)) * 100
        }, 0) / gradedSubs.length
      : null

    const completedAttempts = course.quizzes.flatMap(q => q.attempts)
    const totalQuizMarks = course.quizzes.reduce((sum, q) => {
      const attempt = q.attempts[0]
      return attempt ? sum + (attempt.score ?? 0) : sum
    }, 0)
    const maxQuizMarks = course.quizzes.filter(q => q.attempts.length > 0)
      .reduce((sum, q) => {
        const totalQ = (q as { questions?: { marks: number }[] }).questions?.reduce((s, q) => s + q.marks, 0) ?? 100
        return sum + totalQ
      }, 0)
    const quizPct = completedAttempts.length > 0 && maxQuizMarks > 0
      ? (totalQuizMarks / maxQuizMarks) * 100
      : completedAttempts.length > 0 ? null : null

    const totalSessions = course.attendanceSessions.length
    const present = course.attendanceSessions.filter(s => s.records[0]?.status === 'PRESENT').length
    const attendancePct = totalSessions > 0 ? (present / totalSessions) * 100 : null

    const submitted = course.assignments.filter(a => a.submissions.length > 0).length

    return { course, assignmentPct, quizPct, attendancePct, gradedSubs, completedAttempts, totalSessions, present, submitted }
  })

  // Overall summary for selected semester
  const assignmentScores = courseStats.map(s => s.assignmentPct).filter((v): v is number => v !== null)
  const overallAssignment = assignmentScores.length > 0
    ? Math.round(assignmentScores.reduce((a, b) => a + b, 0) / assignmentScores.length) : null

  const quizScores = courseStats.map(s => s.quizPct).filter((v): v is number => v !== null)
  const overallQuiz = quizScores.length > 0
    ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : null

  const overallPct = [overallAssignment, overallQuiz].filter((v): v is number => v !== null)
  const overallScore = overallPct.length > 0
    ? Math.round(overallPct.reduce((a, b) => a + b, 0) / overallPct.length) : null

  function scoreColor(v: number) {
    return v >= 70 ? 'text-green-700' : v >= 50 ? 'text-orange-600' : 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Keputusan Akademik</h2>
        <p className="text-gray-500 text-sm mt-1">{enrollments.length} kursus berdaftar</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Tiada rekod keputusan</p>
        </div>
      ) : (
        <>
          {/* Semester tabs */}
          {semesters.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {semesters.map(s => {
                const isActive = s.semester === activeSemester && s.year === activeYear
                return (
                  <Link
                    key={`${s.semester}-${s.year}`}
                    href={`/dashboard/student/results?semester=${s.semester}&year=${s.year}`}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    style={isActive ? { backgroundColor: '#0d9488' } : {}}
                  >
                    {s.semester} {s.year}
                  </Link>
                )
              })}
            </div>
          )}

          {/* Per-course cards */}
          <div className="space-y-4">
            {courseStats.map(({ course, assignmentPct, quizPct, attendancePct, completedAttempts, totalSessions, present, submitted }) => (
              <div key={course.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{course.code}</span>
                      <span className="text-xs text-gray-400">{course.semester} · {course.year}</span>
                      {course.department && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">{course.department.name}</span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900">{course.title}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Pensyarah: {course.lecturer.name}</p>
                  </div>
                  <Link href={`/dashboard/student/courses/${course.id}`} className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 transition">
                    Masuk <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Tugasan</span>
                    </div>
                    {assignmentPct !== null ? (
                      <p className={`text-2xl font-bold ${scoreColor(assignmentPct)}`}>{Math.round(assignmentPct)}%</p>
                    ) : <p className="text-2xl font-bold text-gray-300">—</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{submitted}/{course.assignments.length} dihantar</p>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Kuiz</span>
                    </div>
                    {quizPct !== null ? (
                      <p className={`text-2xl font-bold ${scoreColor(quizPct)}`}>{Math.round(quizPct)}%</p>
                    ) : <p className="text-2xl font-bold text-gray-300">—</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{completedAttempts.length}/{course.quizzes.length} selesai</p>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Kehadiran</span>
                    </div>
                    {attendancePct !== null ? (
                      <p className={`text-2xl font-bold ${scoreColor(attendancePct)}`}>{Math.round(attendancePct)}%</p>
                    ) : <p className="text-2xl font-bold text-gray-300">—</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{present}/{totalSessions} hadir</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Overall summary */}
          {filtered.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-teal-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-teal-100 flex items-center gap-3" style={{ backgroundColor: '#f0fdfb' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#0d9488' }} />
                <div>
                  <p className="font-semibold text-gray-900">Ringkasan Keseluruhan</p>
                  <p className="text-xs text-gray-500">{activeSemester} {activeYear} · {filtered.length} kursus</p>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                <div className="px-6 py-5 text-center">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Purata Tugasan</p>
                  {overallAssignment !== null
                    ? <p className={`text-3xl font-bold ${scoreColor(overallAssignment)}`}>{overallAssignment}%</p>
                    : <p className="text-3xl font-bold text-gray-300">—</p>}
                </div>
                <div className="px-6 py-5 text-center">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Purata Kuiz</p>
                  {overallQuiz !== null
                    ? <p className={`text-3xl font-bold ${scoreColor(overallQuiz)}`}>{overallQuiz}%</p>
                    : <p className="text-3xl font-bold text-gray-300">—</p>}
                </div>
                <div className="px-6 py-5 text-center">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Purata Keseluruhan</p>
                  {overallScore !== null
                    ? <p className={`text-3xl font-bold ${scoreColor(overallScore)}`}>{overallScore}%</p>
                    : <p className="text-3xl font-bold text-gray-300">—</p>}
                  {overallScore !== null && (
                    <p className={`text-xs mt-1 font-semibold ${scoreColor(overallScore)}`}>
                      {overallScore >= 80 ? 'Cemerlang' : overallScore >= 70 ? 'Baik' : overallScore >= 60 ? 'Memuaskan' : overallScore >= 50 ? 'Lulus' : 'Perlu Peningkatan'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

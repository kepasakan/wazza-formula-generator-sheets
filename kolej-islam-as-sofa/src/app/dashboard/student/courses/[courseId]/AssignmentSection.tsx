'use client'

import Link from 'next/link'
import { FileText, Clock, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'

type Submission = {
  id: string
  status: 'SUBMITTED' | 'GRADED' | 'LATE'
  score: number | null
  feedback: string | null
  submittedAt: string
  fileUrl: string | null
  notes: string | null
}

type Assignment = {
  id: string
  title: string
  description: string | null
  dueDate: string
  maxScore: number
  submissions: Submission[]
}

export default function AssignmentSection({
  assignments,
  courseId,
}: {
  assignments: Assignment[]
  courseId: string
}) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-gray-400" />
        Tugasan
      </h3>
      <div className="space-y-3">
        {assignments.map(a => {
          const sub = a.submissions[0] ?? null
          const dueDate = new Date(a.dueDate)
          const isOverdue = dueDate < new Date()
          const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86400000)
          const status = sub ? sub.status : isOverdue ? 'OVERDUE' : 'PENDING'

          return (
            <Link
              key={a.id}
              href={`/dashboard/student/courses/${courseId}/assignments/${a.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-gray-900 group-hover:text-green-800 transition-colors">
                      {a.title}
                    </h4>
                    <StatusBadge status={status} score={sub?.score ?? null} maxScore={a.maxScore} />
                  </div>
                  {a.description && (
                    <div
                      className="text-sm text-gray-500 mt-0.5 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: a.description }}
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dueDate.toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                    </span>
                    <span>Markah: {a.maxScore}</span>
                    {status === 'PENDING' && !isOverdue && daysLeft > 0 && (
                      <span className={daysLeft <= 3 ? 'text-orange-500 font-medium' : ''}>
                        {daysLeft} hari lagi
                      </span>
                    )}
                  </div>
                  {sub?.feedback && (
                    <div className="mt-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-sm text-green-800">
                      <span className="font-medium">Maklum balas: </span>{sub.feedback}
                    </div>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-600 transition-colors flex-shrink-0 mt-0.5" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status, score, maxScore }: { status: string; score: number | null; maxScore: number }) {
  if (status === 'GRADED')
    return (
      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
        <CheckCircle className="w-3 h-3" /> Dinilai: {score}/{maxScore}
      </span>
    )
  if (status === 'SUBMITTED')
    return (
      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
        <CheckCircle className="w-3 h-3" /> Dihantar
      </span>
    )
  if (status === 'LATE')
    return (
      <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
        <AlertCircle className="w-3 h-3" /> Lewat
      </span>
    )
  if (status === 'OVERDUE')
    return (
      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
        Tamat Tempoh
      </span>
    )
  return null
}

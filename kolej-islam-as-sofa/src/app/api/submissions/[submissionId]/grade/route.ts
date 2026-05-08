import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { submissionId } = await params

  const submission = await prisma.assignmentSubmission.findFirst({
    where: {
      id: submissionId,
      assignment: { course: { lecturerId: session.userId } },
    },
    include: { assignment: { select: { maxScore: true } } },
  })
  if (!submission) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })

  const { score, feedback } = await req.json()

  if (typeof score !== 'number' || score < 0 || score > submission.assignment.maxScore) {
    return NextResponse.json(
      { error: `Markah mesti antara 0 dan ${submission.assignment.maxScore}` },
      { status: 400 }
    )
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      score,
      feedback: feedback?.trim() || null,
      status: 'GRADED',
    },
  })

  return NextResponse.json(updated)
}

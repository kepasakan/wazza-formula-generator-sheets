import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function verifyOwnership(questionId: string, lecturerId: string) {
  return prisma.quizQuestion.findFirst({
    where: { id: questionId, quiz: { course: { lecturerId } } },
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { questionId } = await params
  const q = await verifyOwnership(questionId, session.userId)
  if (!q) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })

  await prisma.quizAnswer.deleteMany({ where: { questionId } })
  await prisma.quizOption.deleteMany({ where: { questionId } })
  await prisma.quizQuestion.delete({ where: { id: questionId } })

  return NextResponse.json({ success: true })
}

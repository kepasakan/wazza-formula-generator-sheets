import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { courseId } = await params

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: session.userId, courseId } },
  })
  if (!enrollment) return NextResponse.json(null)

  const activeSession = await prisma.attendanceSession.findFirst({
    where: {
      courseId,
      isOpen: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true, title: true, expiresAt: true },
  })

  if (!activeSession) return NextResponse.json(null)

  // Check if already marked
  const alreadyMarked = await prisma.attendanceRecord.findUnique({
    where: {
      sessionId_studentId: { sessionId: activeSession.id, studentId: session.userId },
    },
  })

  return NextResponse.json({
    ...activeSession,
    alreadyMarked: !!alreadyMarked,
    expiresAt: activeSession.expiresAt?.toISOString() ?? null,
  })
}

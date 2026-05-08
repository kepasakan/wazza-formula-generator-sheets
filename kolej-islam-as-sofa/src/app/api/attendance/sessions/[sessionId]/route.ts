import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  const attendanceSession = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, course: { lecturerId: session.userId } },
    include: {
      course: {
        include: {
          enrollments: {
            include: { student: { select: { id: true, name: true, matricNo: true } } },
          },
        },
      },
      records: {
        include: { student: { select: { id: true, name: true, matricNo: true } } },
        orderBy: { markedAt: 'asc' },
      },
    },
  })
  if (!attendanceSession) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })

  // Auto-close if expired
  if (
    attendanceSession.isOpen &&
    attendanceSession.expiresAt &&
    new Date() > new Date(attendanceSession.expiresAt)
  ) {
    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { isOpen: false },
    })
    attendanceSession.isOpen = false
  }

  return NextResponse.json(attendanceSession)
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  const attendanceSession = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, course: { lecturerId: session.userId } },
  })
  if (!attendanceSession) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })

  const updated = await prisma.attendanceSession.update({
    where: { id: sessionId },
    data: { isOpen: false },
  })

  return NextResponse.json(updated)
}

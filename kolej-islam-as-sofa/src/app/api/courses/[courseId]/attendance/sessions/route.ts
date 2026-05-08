import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { courseId } = await params

  const course = await prisma.course.findFirst({
    where: { id: courseId, lecturerId: session.userId },
  })
  if (!course) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })

  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId },
    include: {
      records: { include: { student: { select: { name: true, matricNo: true } } } },
      _count: { select: { records: true } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(sessions)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { courseId } = await params

  const course = await prisma.course.findFirst({
    where: { id: courseId, lecturerId: session.userId },
  })
  if (!course) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 })

  // Close any existing open sessions for this course first
  await prisma.attendanceSession.updateMany({
    where: { courseId, isOpen: true },
    data: { isOpen: false },
  })

  const { title, durationMinutes } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Tajuk sesi diperlukan' }, { status: 400 })

  const code = generateCode()
  const expiresAt = durationMinutes
    ? new Date(Date.now() + Number(durationMinutes) * 60 * 1000)
    : null

  const attendanceSession = await prisma.attendanceSession.create({
    data: {
      courseId,
      title: title.trim(),
      code,
      isOpen: true,
      expiresAt,
    },
    include: { _count: { select: { records: true } } },
  })

  return NextResponse.json(attendanceSession, { status: 201 })
}

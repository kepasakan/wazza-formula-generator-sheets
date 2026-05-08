import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await req.json()
  if (!code?.trim()) {
    return NextResponse.json({ error: 'Kod diperlukan' }, { status: 400 })
  }

  const attendanceSession = await prisma.attendanceSession.findFirst({
    where: { code: code.trim(), isOpen: true },
  })

  if (!attendanceSession) {
    return NextResponse.json({ error: 'Kod tidak sah atau sesi sudah ditutup' }, { status: 400 })
  }

  // Check if expired
  if (attendanceSession.expiresAt && new Date() > new Date(attendanceSession.expiresAt)) {
    await prisma.attendanceSession.update({
      where: { id: attendanceSession.id },
      data: { isOpen: false },
    })
    return NextResponse.json({ error: 'Sesi kehadiran telah tamat masa' }, { status: 400 })
  }

  // Verify student is enrolled
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: session.userId,
        courseId: attendanceSession.courseId,
      },
    },
  })
  if (!enrollment) {
    return NextResponse.json({ error: 'Anda tidak berdaftar dalam kursus ini' }, { status: 403 })
  }

  // Check if already marked
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      sessionId_studentId: {
        sessionId: attendanceSession.id,
        studentId: session.userId,
      },
    },
  })
  if (existing) {
    return NextResponse.json({ error: 'Kehadiran anda sudah direkodkan' }, { status: 400 })
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      sessionId: attendanceSession.id,
      studentId: session.userId,
      status: 'PRESENT',
    },
  })

  return NextResponse.json({ success: true, record }, { status: 201 })
}

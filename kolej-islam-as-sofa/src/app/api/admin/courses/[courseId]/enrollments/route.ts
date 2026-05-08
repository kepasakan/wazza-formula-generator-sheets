import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { courseId } = await params
  const { studentId } = await req.json()

  if (!studentId) return NextResponse.json({ error: 'studentId diperlukan' }, { status: 400 })

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  })
  if (existing) return NextResponse.json({ error: 'Pelajar sudah berdaftar' }, { status: 400 })

  const enrollment = await prisma.enrollment.create({
    data: { studentId, courseId },
    include: { student: { select: { id: true, name: true, matricNo: true } } },
  })

  return NextResponse.json(enrollment, { status: 201 })
}

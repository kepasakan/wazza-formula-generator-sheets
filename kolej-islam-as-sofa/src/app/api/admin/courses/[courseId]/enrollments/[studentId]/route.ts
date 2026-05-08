import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string; studentId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { courseId, studentId } = await params

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  })
  if (!enrollment) return NextResponse.json({ error: 'Pendaftaran tidak dijumpai' }, { status: 404 })

  await prisma.enrollment.delete({
    where: { studentId_courseId: { studentId, courseId } },
  })

  return NextResponse.json({ success: true })
}

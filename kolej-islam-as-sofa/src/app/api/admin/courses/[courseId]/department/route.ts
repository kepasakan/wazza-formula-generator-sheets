import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { courseId } = await params
  const { departmentId } = await req.json()

  const course = await prisma.course.update({
    where: { id: courseId },
    data: { departmentId: departmentId ?? null },
  })

  return NextResponse.json(course)
}

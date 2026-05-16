import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { name, code } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nama bidang diperlukan' }, { status: 400 })

  const dept = await prisma.department.update({
    where: { id },
    data: { name: name.trim(), code: code?.trim() || null },
    include: { _count: { select: { courses: true } } },
  })

  return NextResponse.json(dept)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Unlink courses before deleting
  await prisma.course.updateMany({ where: { departmentId: id }, data: { departmentId: null } })
  await prisma.department.delete({ where: { id } })

  return NextResponse.json({ success: true })
}

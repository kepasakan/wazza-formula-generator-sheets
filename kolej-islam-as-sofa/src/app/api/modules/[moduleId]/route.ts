import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function verifyLecturerOwnsModule(moduleId: string, lecturerId: string) {
  return prisma.module.findFirst({
    where: { id: moduleId, course: { lecturerId } },
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleId } = await params
  const mod = await verifyLecturerOwnsModule(moduleId, session.userId)
  if (!mod) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { title, description } = await req.json()
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }

  const updated = await prisma.module.update({
    where: { id: moduleId },
    data: { title: title.trim(), description: description ?? null },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleId } = await params
  const mod = await verifyLecturerOwnsModule(moduleId, session.userId)
  if (!mod) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.moduleContent.deleteMany({ where: { moduleId } })
  await prisma.module.delete({ where: { id: moduleId } })

  return NextResponse.json({ success: true })
}

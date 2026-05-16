import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { courses: true } } },
  })

  return NextResponse.json(departments)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, code } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nama bidang diperlukan' }, { status: 400 })

  const existing = await prisma.department.findUnique({ where: { name: name.trim() } })
  if (existing) return NextResponse.json({ error: 'Nama bidang sudah wujud' }, { status: 400 })

  const dept = await prisma.department.create({
    data: { name: name.trim(), code: code?.trim() || null },
    include: { _count: { select: { courses: true } } },
  })

  return NextResponse.json(dept, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const links = await prisma.supportLink.findMany({
    where: { isActive: true },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(links)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, url, description, category } = await req.json()

  if (!title?.trim() || !url?.trim()) {
    return NextResponse.json({ error: 'Tajuk dan URL diperlukan' }, { status: 400 })
  }

  const count = await prisma.supportLink.count()

  const link = await prisma.supportLink.create({
    data: {
      title: title.trim(),
      url: url.trim(),
      description: description?.trim() || null,
      category: category?.trim() || null,
      orderIndex: count,
    },
  })

  return NextResponse.json(link, { status: 201 })
}

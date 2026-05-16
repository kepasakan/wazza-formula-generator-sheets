import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { title, url, description, category, isActive } = await req.json()

  if (!title?.trim() || !url?.trim()) {
    return NextResponse.json({ error: 'Tajuk dan URL diperlukan' }, { status: 400 })
  }

  const link = await prisma.supportLink.update({
    where: { id },
    data: {
      title: title.trim(),
      url: url.trim(),
      description: description?.trim() || null,
      category: category?.trim() || null,
      isActive: isActive ?? true,
    },
  })

  return NextResponse.json(link)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  await prisma.supportLink.delete({ where: { id } })

  return NextResponse.json({ success: true })
}

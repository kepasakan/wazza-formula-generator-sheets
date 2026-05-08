import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, code, description, semester, year, lecturerId } = await req.json()

  if (!title?.trim() || !code?.trim() || !semester?.trim() || !year?.trim() || !lecturerId) {
    return NextResponse.json({ error: 'Semua medan wajib diperlukan' }, { status: 400 })
  }

  const existing = await prisma.course.findUnique({ where: { code: code.trim().toUpperCase() } })
  if (existing) {
    return NextResponse.json({ error: 'Kod kursus sudah digunakan' }, { status: 400 })
  }

  const course = await prisma.course.create({
    data: {
      title: title.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || null,
      semester: semester.trim(),
      year: year.trim(),
      lecturerId,
      isPublished: true,
    },
    include: {
      lecturer: { select: { name: true } },
      _count: { select: { enrollments: true, assignments: true, quizzes: true } },
    },
  })

  return NextResponse.json(course, { status: 201 })
}

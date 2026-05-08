import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const MAX_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { assignmentId } = await params

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      course: { enrollments: { some: { studentId: session.userId } } },
    },
  })
  if (!assignment) return NextResponse.json({ error: 'Tugasan tidak dijumpai' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const notes = formData.get('notes') as string | null

  if ((!file || file.size === 0) && !notes?.trim()) {
    return NextResponse.json({ error: 'Fail atau nota diperlukan' }, { status: 400 })
  }

  let fileUrl: string | null = null

  if (file && file.size > 0) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Jenis fail tidak dibenarkan (PDF, Word, atau gambar sahaja)' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fail terlalu besar (maks 20MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${randomUUID()}-${safeName}`

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)
    fileUrl = `/uploads/${filename}`
  }

  const isLate = new Date() > new Date(assignment.dueDate)

  const submission = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: session.userId } },
    create: {
      assignmentId,
      studentId: session.userId,
      fileUrl,
      notes: notes?.trim() || null,
      status: isLate ? 'LATE' : 'SUBMITTED',
    },
    update: {
      fileUrl: fileUrl ?? undefined,
      notes: notes?.trim() || null,
      status: isLate ? 'LATE' : 'SUBMITTED',
      submittedAt: new Date(),
      score: null,
      feedback: null,
    },
  })

  return NextResponse.json(submission, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { put } from '@vercel/blob'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const MAX_SIZE = 20 * 1024 * 1024

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
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
    const files = formData.getAll('files') as File[]
    const links = formData.getAll('links') as string[]
    const notes = formData.get('notes') as string | null

    const validFiles = files.filter(f => f && f.size > 0)
    const validLinks = links.map(l => l.trim()).filter(Boolean)
    const hasNotes = !!(notes?.trim())

    if (validFiles.length === 0 && validLinks.length === 0 && !hasNotes) {
      return NextResponse.json({ error: 'Sila tulis jawapan, lampirkan fail, atau masukkan pautan' }, { status: 400 })
    }

    // Validate files before uploading
    for (const file of validFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Fail "${file.name}" tidak dibenarkan. PDF, Word, atau gambar sahaja.` }, { status: 400 })
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `Fail "${file.name}" terlalu besar (maks 20MB)` }, { status: 400 })
      }
    }

    const isLate = new Date() > new Date(assignment.dueDate)

    // Upsert submission record
    const submission = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: session.userId } },
      create: {
        assignmentId,
        studentId: session.userId,
        notes: hasNotes ? notes!.trim() : null,
        status: isLate ? 'LATE' : 'SUBMITTED',
      },
      update: {
        notes: hasNotes ? notes!.trim() : null,
        status: isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: new Date(),
        score: null,
        feedback: null,
      },
    })

    // Delete old attachments
    await prisma.submissionAttachment.deleteMany({ where: { submissionId: submission.id } })

    // Upload files to Vercel Blob & create attachment records
    for (const file of validFiles) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: 'Perkhidmatan upload fail tidak dikonfigurasi. Sila hubungi pentadbir.' }, { status: 500 })
      }
      const blob = await put(`lms/submissions/${Date.now()}-${file.name}`, file, { access: 'public' })
      await prisma.submissionAttachment.create({
        data: { submissionId: submission.id, type: 'FILE', url: blob.url, filename: file.name },
      })
    }

    // Create link attachment records
    for (const link of validLinks) {
      await prisma.submissionAttachment.create({
        data: { submissionId: submission.id, type: 'LINK', url: link, filename: null },
      })
    }

    const result = await prisma.assignmentSubmission.findUnique({
      where: { id: submission.id },
      include: { attachments: { orderBy: { createdAt: 'asc' } } },
    })

    return NextResponse.json(result, { status: 201 })

  } catch (err) {
    console.error('[SUBMIT ASSIGNMENT ERROR]', err)
    return NextResponse.json(
      { error: 'Ralat dalaman berlaku. Sila cuba lagi.' },
      { status: 500 }
    )
  }
}

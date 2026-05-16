import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { put } from '@vercel/blob'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Tiada fail disertakan' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fail terlalu besar (maks 10MB)' }, { status: 400 })
  }

  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf'

  // Lecturers: PDF only. Admins: images only. Both: enforce their type.
  if (session.role === 'LECTURER' && !isPdf) {
    return NextResponse.json({ error: 'Hanya fail PDF dibenarkan' }, { status: 400 })
  }
  if (session.role === 'ADMIN' && !isImage) {
    return NextResponse.json({ error: 'Hanya fail gambar dibenarkan' }, { status: 400 })
  }
  if (session.role === 'STUDENT') {
    return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 403 })
  }

  const folder = isImage ? 'lms/images' : 'lms/pdf'
  const blob = await put(`${folder}/${Date.now()}-${file.name}`, file, {
    access: 'public',
  })

  return NextResponse.json({ url: blob.url }, { status: 201 })
}

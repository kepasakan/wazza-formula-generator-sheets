import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, email, password, role, matricNo, staffId, phone } = await req.json()

  if (!name?.trim() || !email?.trim() || !password || !role) {
    return NextResponse.json({ error: 'Nama, email, kata laluan dan peranan diperlukan' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (existing) {
    return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role,
      matricNo: role === 'STUDENT' ? matricNo?.trim() || null : null,
      staffId: role === 'LECTURER' ? staffId?.trim() || null : null,
      phone: phone?.trim() || null,
    },
    select: { id: true, name: true, email: true, role: true, matricNo: true, staffId: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}

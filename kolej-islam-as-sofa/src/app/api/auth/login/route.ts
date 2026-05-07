import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { setSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ message: 'Email dan kata laluan diperlukan' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    return NextResponse.json({ message: 'Email atau kata laluan tidak sah' }, { status: 401 })
  }

  const passwordMatch = await bcrypt.compare(password, user.password)

  if (!passwordMatch) {
    return NextResponse.json({ message: 'Email atau kata laluan tidak sah' }, { status: 401 })
  }

  await setSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'ADMIN' | 'LECTURER' | 'STUDENT',
  })

  return NextResponse.json({
    success: true,
    role: user.role,
    name: user.name,
  })
}

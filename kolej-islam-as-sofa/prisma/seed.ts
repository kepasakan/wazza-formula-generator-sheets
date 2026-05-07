import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? 'file:dev.db' })
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  console.log('🌱 Seeding demo data...')

  // Clear existing data
  await prisma.attendanceRecord.deleteMany()
  await prisma.attendanceSession.deleteMany()
  await prisma.quizAnswer.deleteMany()
  await prisma.quizAttempt.deleteMany()
  await prisma.quizOption.deleteMany()
  await prisma.quizQuestion.deleteMany()
  await prisma.quiz.deleteMany()
  await prisma.assignmentSubmission.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.moduleContent.deleteMany()
  await prisma.module.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()

  const adminPass = await bcrypt.hash('Admin@123', 10)
  const lecturerPass = await bcrypt.hash('Lecturer@123', 10)
  const studentPass = await bcrypt.hash('Student@123', 10)

  // --- USERS ---
  const admin = await prisma.user.create({
    data: {
      name: 'Pengarah Kolej',
      email: 'admin@assofa.edu.my',
      password: adminPass,
      role: 'ADMIN',
      staffId: 'ADM001',
      phone: '013-4567890',
    },
  })

  const lecturer1 = await prisma.user.create({
    data: {
      name: 'Ustaz Ahmad bin Abdullah',
      email: 'ustaz.ahmad@assofa.edu.my',
      password: lecturerPass,
      role: 'LECTURER',
      staffId: 'LCT001',
      phone: '012-3456789',
    },
  })

  const lecturer2 = await prisma.user.create({
    data: {
      name: 'Dr. Nurul Huda binti Razak',
      email: 'dr.nurul@assofa.edu.my',
      password: lecturerPass,
      role: 'LECTURER',
      staffId: 'LCT002',
      phone: '011-2345678',
    },
  })

  const student1 = await prisma.user.create({
    data: {
      name: 'Muhammad Izzat bin Zakaria',
      email: 'izzat@student.assofa.edu.my',
      password: studentPass,
      role: 'STUDENT',
      matricNo: '2024001',
      phone: '019-8765432',
    },
  })

  const student2 = await prisma.user.create({
    data: {
      name: 'Nur Fatimah binti Hassan',
      email: 'fatimah@student.assofa.edu.my',
      password: studentPass,
      role: 'STUDENT',
      matricNo: '2024002',
      phone: '017-6543210',
    },
  })

  const student3 = await prisma.user.create({
    data: {
      name: 'Ahmad Syafiq bin Mohd Noor',
      email: 'syafiq@student.assofa.edu.my',
      password: studentPass,
      role: 'STUDENT',
      matricNo: '2024003',
      phone: '016-5432109',
    },
  })

  console.log('✅ Users created')

  // --- COURSES ---
  const course1 = await prisma.course.create({
    data: {
      title: 'Tajwid Al-Quran',
      code: 'QUR3101',
      description: 'Kursus ini merangkumi asas ilmu tajwid, sifat-sifat huruf, dan cara bacaan Al-Quran yang betul mengikut kaedah yang diterima.',
      semester: 'Semester 2',
      year: '2025/2026',
      lecturerId: lecturer1.id,
    },
  })

  const course2 = await prisma.course.create({
    data: {
      title: 'Hafazan Al-Quran',
      code: 'QUR3102',
      description: 'Kursus hafazan Al-Quran peringkat asas meliputi Juz Amma dan surah-surah pilihan.',
      semester: 'Semester 2',
      year: '2025/2026',
      lecturerId: lecturer1.id,
    },
  })

  const course3 = await prisma.course.create({
    data: {
      title: 'Bahasa Arab Asas',
      code: 'ARB2201',
      description: 'Pengenalan kepada bahasa Arab meliputi nahu, sorof dan perbualan asas.',
      semester: 'Semester 2',
      year: '2025/2026',
      lecturerId: lecturer2.id,
    },
  })

  console.log('✅ Courses created')

  // --- ENROLLMENTS ---
  await prisma.enrollment.createMany({
    data: [
      { studentId: student1.id, courseId: course1.id },
      { studentId: student1.id, courseId: course2.id },
      { studentId: student1.id, courseId: course3.id },
      { studentId: student2.id, courseId: course1.id },
      { studentId: student2.id, courseId: course3.id },
      { studentId: student3.id, courseId: course1.id },
      { studentId: student3.id, courseId: course2.id },
    ],
  })

  console.log('✅ Enrollments created')

  // --- MODULES (QUR3101) ---
  const module1 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: 'Bab 1: Pengenalan Ilmu Tajwid',
      description: 'Asas ilmu tajwid, definisi, dan kepentingannya dalam bacaan Al-Quran',
      orderIndex: 1,
    },
  })

  const module2 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: 'Bab 2: Sifat-sifat Huruf Hijaiyah',
      description: 'Pelajari sifat-sifat setiap huruf hijaiyah dan cara menyebutnya dengan betul',
      orderIndex: 2,
    },
  })

  const module3 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: 'Bab 3: Hukum Nun Mati dan Tanwin',
      description: 'Empat hukum bagi nun mati dan tanwin: Izhar, Idgham, Iqlab, dan Ikhfa',
      orderIndex: 3,
    },
  })

  // Module contents for Bab 1
  await prisma.moduleContent.createMany({
    data: [
      {
        moduleId: module1.id,
        type: 'VIDEO',
        title: 'Video Pengenalan Tajwid',
        youtubeId: 'Muh9VnIVD3E',
        orderIndex: 1,
      },
      {
        moduleId: module1.id,
        type: 'TEXT',
        title: 'Nota Kuliah: Definisi Tajwid',
        textContent: `## Definisi Tajwid\n\nSecara bahasa, tajwid bermaksud **memperindahkan** atau **memperbaguskan**.\n\nSecara istilah, tajwid ialah ilmu yang membincangkan tentang cara menyebut huruf-huruf Al-Quran dengan betul mengikut sifat dan makhrajnya.\n\n### Hukum Mempelajari Tajwid\n\nHukum mempelajari ilmu tajwid adalah **fardhu kifayah**, manakala mengamalkannya semasa membaca Al-Quran adalah **fardhu ain** bagi setiap Muslim.\n\n### Faedah Mempelajari Tajwid\n\n1. Menjaga lidah daripada kesalahan ketika membaca Al-Quran\n2. Memuliakan kalam Allah SWT\n3. Mendapat pahala yang berlipat ganda`,
        orderIndex: 2,
      },
      {
        moduleId: module1.id,
        type: 'PDF',
        title: 'Nota PDF: Pengenalan Tajwid',
        contentUrl: '/docs/tajwid-bab1.pdf',
        orderIndex: 3,
      },
    ],
  })

  // Module contents for Bab 2
  await prisma.moduleContent.createMany({
    data: [
      {
        moduleId: module2.id,
        type: 'VIDEO',
        title: 'Video: Sifat-sifat Huruf',
        youtubeId: 'dQw4w9WgXcQ',
        orderIndex: 1,
      },
      {
        moduleId: module2.id,
        type: 'TEXT',
        title: 'Nota: Sifat Huruf Yang Lazim',
        textContent: `## Sifat-sifat Huruf Yang Lazim\n\nSifat yang lazim adalah sifat tetap yang tidak berubah pada setiap huruf.\n\n### Sifat Qawiyyah (Kuat)\n- **Jahr** - menahan nafas ketika menyebut huruf\n- **Syiddah** - suara tertahan seketika\n- **Isti'la'** - lidah terangkat ke lelangit atas\n\n### Sifat Dha'ifah (Lemah)\n- **Hams** - suara yang keluar bersama nafas\n- **Rakhawah** - suara yang mengalir\n- **Istifal** - lidah turun ke bawah`,
        orderIndex: 2,
      },
    ],
  })

  console.log('✅ Modules and contents created')

  // --- ASSIGNMENTS ---
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const assign1 = await prisma.assignment.create({
    data: {
      courseId: course1.id,
      title: 'Latihan Tajwid Bab 1',
      description: 'Baca dan rakam bacaan surah Al-Fatihah dengan menerapkan hukum tajwid yang telah dipelajari. Hantar fail audio/video.',
      dueDate: nextWeek,
      maxScore: 100,
    },
  })

  const assign2 = await prisma.assignment.create({
    data: {
      courseId: course1.id,
      title: 'Pembentangan Sifat-sifat Huruf',
      description: 'Buat pembentangan ringkas (5 minit) tentang sifat-sifat huruf hijaiyah. Sediakan slaid PowerPoint.',
      dueDate: twoWeeks,
      maxScore: 100,
    },
  })

  const assign3 = await prisma.assignment.create({
    data: {
      courseId: course1.id,
      title: 'Ujian Amali Bacaan (Bab 1)',
      description: 'Ujian amali bacaan peribadi bersama pensyarah.',
      dueDate: lastWeek,
      maxScore: 50,
    },
  })

  // Submission from student1 for assign3 (past, graded)
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assign3.id,
      studentId: student1.id,
      notes: 'Saya telah hadir untuk ujian amali',
      status: 'GRADED',
      score: 45,
      feedback: 'Bacaan baik! Perlu perbaiki sedikit pada huruf ض. Teruskan usaha.',
    },
  })

  // Submission from student1 for assign1
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assign1.id,
      studentId: student1.id,
      notes: 'Ini adalah rakaman bacaan saya untuk tugasan pertama.',
      status: 'SUBMITTED',
    },
  })

  console.log('✅ Assignments created')

  // --- QUIZZES ---
  const quiz1 = await prisma.quiz.create({
    data: {
      courseId: course1.id,
      title: 'Kuiz Pengenalan Tajwid',
      description: 'Kuiz ringkas untuk menguji kefahaman Bab 1',
      duration: 15,
      isPublished: true,
      startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const q1 = await prisma.quizQuestion.create({
    data: {
      quizId: quiz1.id,
      questionText: 'Apakah maksud "tajwid" dari segi bahasa?',
      type: 'MCQ',
      marks: 2,
      orderIndex: 1,
    },
  })

  await prisma.quizOption.createMany({
    data: [
      { questionId: q1.id, optionText: 'Memperindahkan', isCorrect: true, orderIndex: 1 },
      { questionId: q1.id, optionText: 'Mempercepatkan', isCorrect: false, orderIndex: 2 },
      { questionId: q1.id, optionText: 'Memperlahankan', isCorrect: false, orderIndex: 3 },
      { questionId: q1.id, optionText: 'Memperbanyakkan', isCorrect: false, orderIndex: 4 },
    ],
  })

  const q2 = await prisma.quizQuestion.create({
    data: {
      quizId: quiz1.id,
      questionText: 'Hukum mengamalkan tajwid semasa membaca Al-Quran adalah?',
      type: 'MCQ',
      marks: 2,
      orderIndex: 2,
    },
  })

  await prisma.quizOption.createMany({
    data: [
      { questionId: q2.id, optionText: 'Sunat', isCorrect: false, orderIndex: 1 },
      { questionId: q2.id, optionText: 'Harus', isCorrect: false, orderIndex: 2 },
      { questionId: q2.id, optionText: 'Fardhu Ain', isCorrect: true, orderIndex: 3 },
      { questionId: q2.id, optionText: 'Fardhu Kifayah', isCorrect: false, orderIndex: 4 },
    ],
  })

  const q3 = await prisma.quizQuestion.create({
    data: {
      quizId: quiz1.id,
      questionText: 'Ilmu tajwid membantu menjaga daripada kesalahan ketika membaca Al-Quran.',
      type: 'TRUE_FALSE',
      marks: 1,
      orderIndex: 3,
    },
  })

  await prisma.quizOption.createMany({
    data: [
      { questionId: q3.id, optionText: 'Benar', isCorrect: true, orderIndex: 1 },
      { questionId: q3.id, optionText: 'Salah', isCorrect: false, orderIndex: 2 },
    ],
  })

  const q4 = await prisma.quizQuestion.create({
    data: {
      quizId: quiz1.id,
      questionText: 'Berapa jumlah huruf hijaiyah dalam Al-Quran?',
      type: 'MCQ',
      marks: 2,
      orderIndex: 4,
    },
  })

  await prisma.quizOption.createMany({
    data: [
      { questionId: q4.id, optionText: '26 huruf', isCorrect: false, orderIndex: 1 },
      { questionId: q4.id, optionText: '28 huruf', isCorrect: true, orderIndex: 2 },
      { questionId: q4.id, optionText: '30 huruf', isCorrect: false, orderIndex: 3 },
      { questionId: q4.id, optionText: '32 huruf', isCorrect: false, orderIndex: 4 },
    ],
  })

  const q5 = await prisma.quizQuestion.create({
    data: {
      quizId: quiz1.id,
      questionText: 'Apakah nama ilmu yang membahaskan cara menyebut huruf-huruf Al-Quran?',
      type: 'MCQ',
      marks: 3,
      orderIndex: 5,
    },
  })

  await prisma.quizOption.createMany({
    data: [
      { questionId: q5.id, optionText: 'Ilmu Nahu', isCorrect: false, orderIndex: 1 },
      { questionId: q5.id, optionText: 'Ilmu Sorof', isCorrect: false, orderIndex: 2 },
      { questionId: q5.id, optionText: 'Ilmu Tajwid', isCorrect: true, orderIndex: 3 },
      { questionId: q5.id, optionText: 'Ilmu Balaghah', isCorrect: false, orderIndex: 4 },
    ],
  })

  console.log('✅ Quizzes created')

  // --- ATTENDANCE SESSIONS ---
  const session1 = await prisma.attendanceSession.create({
    data: {
      courseId: course1.id,
      title: 'Kuliah Minggu 1 - Pengenalan Tajwid',
      date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      code: 'QUR001',
      isOpen: false,
    },
  })

  await prisma.attendanceRecord.createMany({
    data: [
      { sessionId: session1.id, studentId: student1.id, status: 'PRESENT' },
      { sessionId: session1.id, studentId: student2.id, status: 'PRESENT' },
      { sessionId: session1.id, studentId: student3.id, status: 'LATE' },
    ],
  })

  const session2 = await prisma.attendanceSession.create({
    data: {
      courseId: course1.id,
      title: 'Kuliah Minggu 2 - Makhraj Huruf',
      date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      code: 'QUR002',
      isOpen: false,
    },
  })

  await prisma.attendanceRecord.createMany({
    data: [
      { sessionId: session2.id, studentId: student1.id, status: 'PRESENT' },
      { sessionId: session2.id, studentId: student2.id, status: 'ABSENT' },
      { sessionId: session2.id, studentId: student3.id, status: 'PRESENT' },
    ],
  })

  const session3 = await prisma.attendanceSession.create({
    data: {
      courseId: course1.id,
      title: 'Kuliah Minggu 3 - Sifat Huruf',
      date: now,
      code: 'QUR003',
      isOpen: true,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    },
  })

  await prisma.attendanceRecord.create({
    data: { sessionId: session3.id, studentId: student1.id, status: 'PRESENT' },
  })

  console.log('✅ Attendance sessions created')

  console.log('\n✨ Seeding complete!')
  console.log('\n📋 Demo Credentials:')
  console.log('  Admin:    admin@assofa.edu.my     / Admin@123')
  console.log('  Lecturer: ustaz.ahmad@assofa.edu.my / Lecturer@123')
  console.log('  Student:  izzat@student.assofa.edu.my / Student@123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

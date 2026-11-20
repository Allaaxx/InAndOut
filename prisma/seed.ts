import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hashPassword(plain: string): string {
  return createHash('sha256').update(`inandout-salt:${plain}`).digest('hex');
}

export async function main(): Promise<void> {
  console.log('🌱 Seeding database for Escola Estadual José Lins do Rego...');

  // 1. Seed Users (Professores, Coordenadores, Administradores)
  const users = [
    {
      id: 'teacher-1',
      name: 'Prof. Carlos Eduardo',
      email: 'prof@linsdorego.edu.br',
      passwordHash: hashPassword('senha123'),
      role: 'TEACHER',
      pinCodeHash: '1234',
    },
    {
      id: 'teacher-2',
      name: 'Profª. Fernanda Souza',
      email: 'fernanda@linsdorego.edu.br',
      passwordHash: hashPassword('senha123'),
      role: 'TEACHER',
      pinCodeHash: '5678',
    },
    {
      id: 'coord-1',
      name: 'Coord. Mariana Alves',
      email: 'coord@linsdorego.edu.br',
      passwordHash: hashPassword('coord123'),
      role: 'COORDINATOR',
      pinCodeHash: '9999',
    },
    {
      id: 'admin-1',
      name: 'Dir. Roberto Lins',
      email: 'admin@linsdorego.edu.br',
      passwordHash: hashPassword('admin123'),
      role: 'ADMIN',
      pinCodeHash: '0000',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: user,
      update: user,
    });
  }

  console.log(`✅ Seeded ${users.length} users.`);

  // 1.5. Seed Rooms (Salas de Aula)
  const rooms = [
    {
      id: 'room-sala-01',
      code: 'SALA-01',
      name: 'Sala 01',
      isActive: true,
    },
    {
      id: 'room-sala-02',
      code: 'SALA-02',
      name: 'Sala 02',
      isActive: true,
    },
    {
      id: 'room-sala-03',
      code: 'SALA-03',
      name: 'Sala 03',
      isActive: true,
    },
    {
      id: 'room-lab-01',
      code: 'LAB-01',
      name: 'Laboratório 01',
      isActive: true,
    },
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { code: room.code },
      create: room,
      update: room,
    });
  }

  console.log(
    `✅ Seeded ${rooms.length} rooms (SALA-01, SALA-02, SALA-03, LAB-01).`,
  );

  // 2. Seed Students (Turmas 1A, 2B, 3C)
  const students = [
    // Turma 1A
    {
      id: 'student-1001',
      ra: '1001',
      fullName: 'Lucas Silva',
      classCode: '1A',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
    {
      id: 'student-1002',
      ra: '1002',
      fullName: 'João Mendes',
      classCode: '1A',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
    {
      id: 'student-1003',
      ra: '1003',
      fullName: 'Ana Costa',
      classCode: '1A',
      hasSpecialCondition: true,
      specialLimitMinutes: 20,
    },
    {
      id: 'student-1004',
      ra: '1004',
      fullName: 'Beatriz Santos',
      classCode: '1A',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },

    // Turma 2B
    {
      id: 'student-2001',
      ra: '2001',
      fullName: 'Pedro Alves',
      classCode: '2B',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
    {
      id: 'student-2002',
      ra: '2002',
      fullName: 'Camila Rocha',
      classCode: '2B',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
    {
      id: 'student-2003',
      ra: '2003',
      fullName: 'Gabriel Lima',
      classCode: '2B',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
    {
      id: 'student-2004',
      ra: '2004',
      fullName: 'Larissa Souza',
      classCode: '2B',
      hasSpecialCondition: true,
      specialLimitMinutes: 15,
    },

    // Turma 3C
    {
      id: 'student-3001',
      ra: '3001',
      fullName: 'Felipe Martins',
      classCode: '3A',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
    {
      id: 'student-3002',
      ra: '3002',
      fullName: 'Juliana Ramos',
      classCode: '3A',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
    {
      id: 'student-3003',
      ra: '3003',
      fullName: 'Matheus Pereira',
      classCode: '3A',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
    {
      id: 'student-3004',
      ra: '3004',
      fullName: 'Sofia Carvalho',
      classCode: '3A',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
  ];

  for (const student of students) {
    await prisma.student.upsert({
      where: { ra: student.ra },
      create: student,
      update: student,
    });
  }

  console.log(
    `✅ Seeded ${students.length} students across turmas 1A, 2B, and 3C.`,
  );

  // 3. Seed Class Sessions (Salas e Sessões Pedagógicas)
  const sessions = [
    {
      id: 'session-1',
      teacherId: 'teacher-1',
      teacherName: 'Prof. Carlos Eduardo',
      roomId: 'SALA-01',
      classCode: '1A',
      subject: 'História',
      status: 'ACTIVE',
      startedAt: new Date(),
      durationMinutes: 50,
      defaultTimeLimitMinutes: 10,
    },
    {
      id: 'session-2',
      teacherId: 'teacher-2',
      teacherName: 'Profª. Fernanda Souza',
      roomId: 'SALA-02',
      classCode: '2B',
      subject: 'Matemática',
      status: 'ACTIVE',
      startedAt: new Date(),
      durationMinutes: 50,
      defaultTimeLimitMinutes: 10,
    },
  ];

  for (const session of sessions) {
    await prisma.classSession.upsert({
      where: { id: session.id },
      create: session,
      update: session,
    });
  }

  console.log(
    `✅ Seeded ${sessions.length} class sessions (SALA-01, SALA-02).`,
  );

  // 4. Seed Initial Movement Record and Waiting Queue Entry (Relações ativas)
  const initialMovement = {
    id: 'mov-seed-1',
    sessionId: 'session-1',
    studentId: 'student-1001',
    studentRa: '1001',
    studentFullName: 'Lucas Silva',
    studentPublicName: 'Lucas S.',
    classCode: '1A',
    subject: 'História',
    roomId: 'SALA-01',
    teacherName: 'Prof. Carlos Eduardo',
    startedAt: new Date(),
    status: 'IN_TRANSIT',
    allowedLimitMinutes: 10,
  };

  await prisma.movementRecord.upsert({
    where: { id: initialMovement.id },
    create: initialMovement,
    update: initialMovement,
  });

  const initialQueue = {
    id: 'queue-seed-1',
    sessionId: 'session-1',
    studentRa: '1002',
    studentFullName: 'João Mendes',
    studentPublicName: 'João M.',
    classCode: '1A',
    position: 1,
    enqueuedAt: new Date(),
    status: 'WAITING',
  };

  await prisma.waitingQueueEntry.upsert({
    where: { id: initialQueue.id },
    create: initialQueue,
    update: initialQueue,
  });

  console.log('✅ Seeded initial movement record and waiting queue entry.');
  console.log('✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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
      classCode: '3C',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
    {
      id: 'student-3002',
      ra: '3002',
      fullName: 'Juliana Ramos',
      classCode: '3C',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
    {
      id: 'student-3003',
      ra: '3003',
      fullName: 'Matheus Pereira',
      classCode: '3C',
      hasSpecialCondition: false,
      specialLimitMinutes: null,
    },
    {
      id: 'student-3004',
      ra: '3004',
      fullName: 'Sofia Carvalho',
      classCode: '3C',
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

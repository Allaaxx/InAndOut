import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Prisma Lifecycle Scripts and Relational Schema (Ticket #31)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const migrationsDir = path.join(rootDir, 'prisma/migrations');

  describe('package.json lifecycle scripts', () => {
    it('defines db:migrate script pointing to prisma migrate dev', () => {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(pkg.scripts['db:migrate']).toBe('prisma migrate dev');
    });

    it('defines db:seed script pointing to prisma db seed', () => {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(pkg.scripts['db:seed']).toBe('prisma db seed');
    });

    it('defines db:studio script pointing to prisma studio', () => {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(pkg.scripts['db:studio']).toBe('prisma studio');
    });

    it('defines db:reset script pointing to prisma migrate reset', () => {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(pkg.scripts['db:reset']).toBe('prisma migrate reset');
    });
  });

  describe('Prisma migrations', () => {
    it('contains initial migration directory with migration.sql', () => {
      expect(fs.existsSync(migrationsDir)).toBe(true);
      const entries = fs.readdirSync(migrationsDir);
      const initMigrationDir = entries.find((e) =>
        e.includes('init_relational_schema'),
      );
      expect(initMigrationDir).toBeDefined();

      const migrationSqlPath = path.join(
        migrationsDir,
        initMigrationDir!,
        'migration.sql',
      );
      expect(fs.existsSync(migrationSqlPath)).toBe(true);

      const sqlContent = fs.readFileSync(migrationSqlPath, 'utf-8');
      expect(sqlContent).toContain('CREATE TABLE "users"');
      expect(sqlContent).toContain('CREATE TABLE "class_sessions"');
      expect(sqlContent).toContain('CREATE TABLE "students"');
      expect(sqlContent).toContain('CREATE TABLE "movement_records"');
      expect(sqlContent).toContain('CREATE TABLE "waiting_queue_entries"');
    });
  });

  describe('PostgreSQL live schema and seed verification', () => {
    const envPath = path.join(rootDir, '.env');
    let dbUrl: string | null = null;

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^DATABASE_URL=(.+)$/m);
      if (match) {
        dbUrl = match[1].trim();
      }
    }

    it('verifies seeded users, students, rooms, sessions, and relations in postgres', async () => {
      if (!dbUrl) {
        console.warn(
          'DATABASE_URL not found in .env; skipping live database verification',
        );
        return;
      }

      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: { url: dbUrl },
        },
      });

      try {
        // 1. Verify Users (teachers, coordinator, admin)
        const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
        expect(users.length).toBeGreaterThanOrEqual(4);
        const roles = users.map((u) => u.role);
        expect(roles).toContain('TEACHER');
        expect(roles).toContain('COORDINATOR');
        expect(roles).toContain('ADMIN');

        // 2. Verify Students
        const students = await prisma.student.findMany();
        expect(students.length).toBe(12);
        const classes = new Set(students.map((s) => s.classCode));
        expect(classes.has('1A')).toBe(true);
        expect(classes.has('2B')).toBe(true);
        expect(classes.has('3C')).toBe(true);

        // 3. Verify Class Sessions & Rooms
        const sessions = await prisma.classSession.findMany({
          include: {
            teacher: true,
            movements: true,
            queueEntries: true,
          },
        });
        expect(sessions.length).toBeGreaterThanOrEqual(2);
        const rooms = sessions.map((s) => s.roomId);
        expect(rooms).toContain('SALA-01');
        expect(rooms).toContain('SALA-02');

        const activeSessions = sessions.filter((s) => s.status === 'ACTIVE');
        expect(activeSessions.length).toBeGreaterThanOrEqual(2);

        // 4. Verify Relations
        const session1 = sessions.find((s) => s.id === 'session-1');
        expect(session1).toBeDefined();
        expect(session1?.teacher).not.toBeNull();
        expect(session1?.teacher?.name).toBe('Prof. Carlos Eduardo');
        expect(session1?.movements.length).toBeGreaterThanOrEqual(1);
        expect(session1?.queueEntries.length).toBeGreaterThanOrEqual(1);

        // 5. Verify Movements and Queue entries
        const movements = await prisma.movementRecord.findMany();
        expect(movements.length).toBeGreaterThanOrEqual(1);

        const queueEntries = await prisma.waitingQueueEntry.findMany();
        expect(queueEntries.length).toBeGreaterThanOrEqual(1);
      } finally {
        await prisma.$disconnect();
      }
    });
  });
});

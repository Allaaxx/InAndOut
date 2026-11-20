import type { PrismaClient } from '@prisma/client';
import { ClassGroup } from '@server/domain/entities/ClassGroup';
import { ClassSession } from '@server/domain/entities/ClassSession';
import { MovementRecord } from '@server/domain/entities/MovementRecord';
import { Room } from '@server/domain/entities/Room';
import { Student } from '@server/domain/entities/Student';
import { User } from '@server/domain/entities/User';
import { WaitingQueueEntry } from '@server/domain/entities/WaitingQueueEntry';
import {
  InMemoryClassGroupRepository,
  InMemoryClassSessionRepository,
  InMemoryMovementRecordRepository,
  InMemoryRoomRepository,
  InMemoryStudentRepository,
  InMemoryUserRepository,
  InMemoryWaitingQueueRepository,
} from '@server/infrastructure/repositories';
import {
  PrismaClassGroupRepository,
  PrismaClassSessionRepository,
  PrismaMovementRecordRepository,
  PrismaRoomRepository,
  PrismaStudentRepository,
  PrismaUserRepository,
  PrismaWaitingQueueRepository,
} from '@server/infrastructure/repositories/prisma';
import { createContainer } from '@server/main/container';
import { MovementStatus, QueueEntryStatus, UserRole } from '@shared/enums';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Hybrid Container & Prisma Repositories (Ticket #26)', () => {
  const originalEnv = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  describe('Container Toggling (In-Memory vs Prisma)', () => {
    it('instantiates InMemory repositories when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;

      const container = createContainer();

      expect(container.userRepo).toBeInstanceOf(InMemoryUserRepository);
      expect(container.roomRepo).toBeInstanceOf(InMemoryRoomRepository);
      expect(container.classGroupRepo).toBeInstanceOf(
        InMemoryClassGroupRepository,
      );
      expect(container.sessionRepo).toBeInstanceOf(
        InMemoryClassSessionRepository,
      );
      expect(container.studentRepo).toBeInstanceOf(InMemoryStudentRepository);
      expect(container.movementRepo).toBeInstanceOf(
        InMemoryMovementRecordRepository,
      );
      expect(container.queueRepo).toBeInstanceOf(
        InMemoryWaitingQueueRepository,
      );
    });

    it('instantiates InMemory repositories when DATABASE_URL is empty', () => {
      process.env.DATABASE_URL = '   ';

      const container = createContainer();

      expect(container.userRepo).toBeInstanceOf(InMemoryUserRepository);
      expect(container.roomRepo).toBeInstanceOf(InMemoryRoomRepository);
      expect(container.classGroupRepo).toBeInstanceOf(
        InMemoryClassGroupRepository,
      );
      expect(container.sessionRepo).toBeInstanceOf(
        InMemoryClassSessionRepository,
      );
      expect(container.studentRepo).toBeInstanceOf(InMemoryStudentRepository);
      expect(container.movementRepo).toBeInstanceOf(
        InMemoryMovementRecordRepository,
      );
      expect(container.queueRepo).toBeInstanceOf(
        InMemoryWaitingQueueRepository,
      );
    });

    it('instantiates Prisma repositories when DATABASE_URL is set', () => {
      process.env.DATABASE_URL =
        'postgresql://user:secret@localhost:5432/inandout?schema=public';

      const container = createContainer();

      expect(container.userRepo).toBeInstanceOf(PrismaUserRepository);
      expect(container.roomRepo).toBeInstanceOf(PrismaRoomRepository);
      expect(container.classGroupRepo).toBeInstanceOf(
        PrismaClassGroupRepository,
      );
      expect(container.sessionRepo).toBeInstanceOf(
        PrismaClassSessionRepository,
      );
      expect(container.studentRepo).toBeInstanceOf(PrismaStudentRepository);
      expect(container.movementRepo).toBeInstanceOf(
        PrismaMovementRecordRepository,
      );
      expect(container.queueRepo).toBeInstanceOf(PrismaWaitingQueueRepository);
    });

    it('honors repository overrides regardless of DATABASE_URL', () => {
      process.env.DATABASE_URL =
        'postgresql://user:secret@localhost:5432/inandout';

      const customUserRepo = new InMemoryUserRepository();
      const container = createContainer({ userRepo: customUserRepo });

      expect(container.userRepo).toBe(customUserRepo);
      expect(container.sessionRepo).toBeInstanceOf(
        PrismaClassSessionRepository,
      );
    });
  });

  describe('Prisma Repositories Contract & Domain Mapping', () => {
    it('PrismaUserRepository maps domain User to/from Prisma schema correctly', async () => {
      const mockPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'teacher-1',
            name: 'Prof. Carlos Eduardo',
            email: 'prof@linsdorego.edu.br',
            passwordHash: 'hash123',
            role: 'TEACHER',
            pinCodeHash: '1234',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          upsert: vi.fn().mockResolvedValue({}),
        },
      } as unknown as PrismaClient;

      const repo = new PrismaUserRepository(mockPrisma);

      const user = await repo.findByEmail('Prof@LinsDoRego.edu.br');
      expect(user).not.toBeNull();
      expect(user?.id).toBe('teacher-1');
      expect(user?.name).toBe('Prof. Carlos Eduardo');
      expect(user?.email).toBe('prof@linsdorego.edu.br');
      expect(user?.role).toBe(UserRole.TEACHER);
      expect(user?.verifyPin('1234')).toBe(true);
      expect(user?.verifyPin('9999')).toBe(false);

      const domainUser = User.create({
        id: 'user-new',
        name: 'Maria Souza',
        email: 'maria@linsdorego.edu.br',
        passwordHash: 'secret_hash',
        role: UserRole.COORDINATOR,
        pinCode: '4321',
      });

      await repo.save(domainUser);
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 'user-new' },
        create: {
          id: 'user-new',
          name: 'Maria Souza',
          email: 'maria@linsdorego.edu.br',
          passwordHash: 'secret_hash',
          role: 'COORDINATOR',
          pinCodeHash: '4321',
        },
        update: {
          name: 'Maria Souza',
          email: 'maria@linsdorego.edu.br',
          passwordHash: 'secret_hash',
          role: 'COORDINATOR',
          pinCodeHash: '4321',
        },
      });
    });

    it('PrismaClassSessionRepository maps domain ClassSession correctly', async () => {
      const startedAt = new Date('2026-03-01T10:00:00Z');
      const mockPrisma = {
        classSession: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'session-1',
            teacherId: 'teacher-1',
            teacherName: 'Prof. Carlos Eduardo',
            roomId: 'SALA-01',
            classCode: '1A',
            subject: 'História',
            status: 'ACTIVE',
            startedAt,
            endedAt: null,
            durationMinutes: 50,
            defaultTimeLimitMinutes: 10,
            notes: null,
            createdAt: startedAt,
            updatedAt: startedAt,
          }),
          findFirst: vi.fn().mockResolvedValue({
            id: 'session-1',
            teacherId: 'teacher-1',
            teacherName: 'Prof. Carlos Eduardo',
            roomId: 'SALA-01',
            classCode: '1A',
            subject: 'História',
            status: 'ACTIVE',
            startedAt,
            endedAt: null,
            durationMinutes: 50,
            defaultTimeLimitMinutes: 10,
            notes: null,
            createdAt: startedAt,
            updatedAt: startedAt,
          }),
          upsert: vi.fn().mockResolvedValue({}),
        },
      } as unknown as PrismaClient;

      const repo = new PrismaClassSessionRepository(mockPrisma);

      const session = await repo.findActiveByRoomId('SALA-01');
      expect(session).not.toBeNull();
      expect(session?.id).toBe('session-1');
      expect(session?.teacherName).toBe('Prof. Carlos Eduardo');
      expect(session?.classCode).toBe('1A');
      expect(session?.subject).toBe('História');
      expect(session?.isActive()).toBe(true);

      const newSession = ClassSession.create({
        id: 'session-2',
        teacherId: 'teacher-2',
        teacherName: 'Profª. Fernanda',
        roomId: 'SALA-02',
        classCode: '2B',
        subject: 'Matemática',
        plannedDurationMinutes: 60,
        defaultTimeLimitMinutes: 15,
      });

      await repo.save(newSession);
      expect(mockPrisma.classSession.upsert).toHaveBeenCalledWith({
        where: { id: 'session-2' },
        create: expect.objectContaining({
          id: 'session-2',
          teacherId: 'teacher-2',
          classCode: '2B',
          subject: 'Matemática',
          durationMinutes: 60,
          defaultTimeLimitMinutes: 15,
        }),
        update: expect.objectContaining({
          teacherId: 'teacher-2',
          classCode: '2B',
        }),
      });
    });

    it('PrismaStudentRepository maps domain Student correctly', async () => {
      const mockPrisma = {
        student: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'student-3',
            ra: '1003',
            fullName: 'Ana Costa',
            classCode: '1A',
            hasSpecialCondition: true,
            specialLimitMinutes: 20,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          findMany: vi.fn().mockResolvedValue([]),
          upsert: vi.fn().mockResolvedValue({}),
        },
      } as unknown as PrismaClient;

      const repo = new PrismaStudentRepository(mockPrisma);

      const student = await repo.findByRa('1003');
      expect(student).not.toBeNull();
      expect(student?.ra).toBe('1003');
      expect(student?.fullName).toBe('Ana Costa');
      expect(student?.hasSpecialTimeLimit()).toBe(true);
      expect(student?.specialTimeLimitMinutes).toBe(20);

      const newStudent = Student.create({
        id: 'student-4',
        ra: '2001',
        fullName: 'Pedro Alves',
        classCode: '2B',
      });

      await repo.save(newStudent);
      expect(mockPrisma.student.upsert).toHaveBeenCalledWith({
        where: { id: 'student-4' },
        create: {
          id: 'student-4',
          ra: '2001',
          fullName: 'Pedro Alves',
          classCode: '2B',
          hasSpecialCondition: false,
          specialLimitMinutes: null,
        },
        update: {
          ra: '2001',
          fullName: 'Pedro Alves',
          classCode: '2B',
          hasSpecialCondition: false,
          specialLimitMinutes: null,
        },
      });
    });

    it('PrismaMovementRecordRepository maps domain MovementRecord and queries active movements correctly', async () => {
      const startedAt = new Date('2026-03-01T10:05:00Z');
      const mockPrisma = {
        movementRecord: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'mov-1',
              sessionId: 'session-1',
              studentId: '1001',
              studentRa: '1001',
              studentFullName: 'Lucas Silva',
              studentPublicName: 'Lucas S.',
              classCode: '1A',
              subject: 'História',
              roomId: 'SALA-01',
              teacherName: 'Prof. Carlos Eduardo',
              startedAt,
              returnedAt: null,
              durationMinutes: null,
              allowedLimitMinutes: 10,
              status: MovementStatus.IN_TRANSIT,
              outcome: null,
              escalatedAt: null,
              escalatedReason: null,
              resolutionNotes: null,
              resolvedBy: null,
              resolvedAt: null,
              attendancePercentage: null,
              attendedMinutes: null,
              isEmergency: false,
              isGuest: false,
              authorizedByTeacherId: null,
              overdueAt: null,
              escalationType: null,
              createdAt: startedAt,
              updatedAt: startedAt,
            },
          ]),
          upsert: vi.fn().mockResolvedValue({}),
        },
      } as unknown as PrismaClient;

      const repo = new PrismaMovementRecordRepository(mockPrisma);

      const activeList = await repo.findActiveBySessionId('session-1');
      expect(activeList).toHaveLength(1);
      expect(activeList[0].id).toBe('mov-1');
      expect(activeList[0].studentFullName).toBe('Lucas Silva');
      expect(activeList[0].isActive()).toBe(true);

      const mov = MovementRecord.create({
        id: 'mov-2',
        sessionId: 'session-1',
        studentRa: '1002',
        studentFullName: 'João Mendes',
        classCode: '1A',
        subject: 'História',
        allowedLimitMinutes: 10,
      });

      await repo.save(mov);
      expect(mockPrisma.movementRecord.upsert).toHaveBeenCalledWith({
        where: { id: 'mov-2' },
        create: expect.objectContaining({
          id: 'mov-2',
          sessionId: 'session-1',
          studentRa: '1002',
          studentFullName: 'João Mendes',
          status: MovementStatus.IN_TRANSIT,
        }),
        update: expect.objectContaining({
          sessionId: 'session-1',
          studentRa: '1002',
        }),
      });
    });

    it('PrismaWaitingQueueRepository maps domain WaitingQueueEntry and orders active queue slots', async () => {
      const enqueuedAt1 = new Date('2026-03-01T10:02:00Z');
      const enqueuedAt2 = new Date('2026-03-01T10:04:00Z');

      const mockPrisma = {
        waitingQueueEntry: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'queue-1',
              sessionId: 'session-1',
              studentRa: '1002',
              studentFullName: 'João Mendes',
              studentPublicName: 'João M.',
              classCode: '1A',
              position: 1,
              enqueuedAt: enqueuedAt1,
              calledAt: null,
              expiresAt: null,
              status: QueueEntryStatus.WAITING,
              createdAt: enqueuedAt1,
              updatedAt: enqueuedAt1,
            },
            {
              id: 'queue-2',
              sessionId: 'session-1',
              studentRa: '1004',
              studentFullName: 'Beatriz Santos',
              studentPublicName: 'Beatriz S.',
              classCode: '1A',
              position: 2,
              enqueuedAt: enqueuedAt2,
              calledAt: null,
              expiresAt: null,
              status: QueueEntryStatus.WAITING,
              createdAt: enqueuedAt2,
              updatedAt: enqueuedAt2,
            },
          ]),
          upsert: vi.fn().mockResolvedValue({}),
        },
      } as unknown as PrismaClient;

      const repo = new PrismaWaitingQueueRepository(mockPrisma);

      const activeQueue = await repo.findActiveBySessionId('session-1');
      expect(activeQueue).toHaveLength(2);
      expect(activeQueue[0].studentRa).toBe('1002');
      expect(activeQueue[0].position).toBe(1);
      expect(activeQueue[1].studentRa).toBe('1004');
      expect(activeQueue[1].position).toBe(2);

      const newEntry = WaitingQueueEntry.create({
        id: 'queue-3',
        sessionId: 'session-1',
        studentRa: '1003',
        studentFullName: 'Ana Costa',
        position: 3,
      });

      await repo.save(newEntry);
      expect(mockPrisma.waitingQueueEntry.upsert).toHaveBeenCalledWith({
        where: { id: 'queue-3' },
        create: expect.objectContaining({
          id: 'queue-3',
          sessionId: 'session-1',
          studentRa: '1003',
          studentFullName: 'Ana Costa',
          status: QueueEntryStatus.WAITING,
        }),
        update: expect.objectContaining({
          sessionId: 'session-1',
          studentRa: '1003',
        }),
      });
    });

    it('PrismaRoomRepository maps domain Room to/from Prisma schema correctly', async () => {
      const now = new Date('2026-03-10T08:00:00.000Z');
      const mockPrisma = {
        room: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'room-sala-01',
            code: 'SALA-01',
            name: 'Sala 01',
            isActive: true,
            createdAt: now,
            updatedAt: now,
          }),
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'room-sala-01',
              code: 'SALA-01',
              name: 'Sala 01',
              isActive: true,
              createdAt: now,
              updatedAt: now,
            },
          ]),
          upsert: vi.fn().mockResolvedValue({}),
        },
      } as unknown as PrismaClient;

      const repo = new PrismaRoomRepository(mockPrisma);

      const found = await repo.findByCode(' sala-01 ');
      expect(found).not.toBeNull();
      expect(found?.code).toBe('SALA-01');
      expect(found?.name).toBe('Sala 01');
      expect(found?.isActive).toBe(true);

      const list = await repo.findAll({ onlyActive: true });
      expect(list).toHaveLength(1);
      expect(mockPrisma.room.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });

      const newRoom = Room.create({
        id: 'room-lab-02',
        code: 'lab-02',
        name: 'Laboratório 02',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await repo.save(newRoom);
      expect(mockPrisma.room.upsert).toHaveBeenCalledWith({
        where: { id: 'room-lab-02' },
        create: {
          id: 'room-lab-02',
          code: 'LAB-02',
          name: 'Laboratório 02',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          code: 'LAB-02',
          name: 'Laboratório 02',
          isActive: true,
          updatedAt: now,
        },
      });
    });

    it('PrismaClassGroupRepository maps domain ClassGroup and enforces composite (code, academicYear) lookup', async () => {
      const now = new Date('2026-03-10T08:00:00.000Z');
      const mockPrisma = {
        classGroup: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'class-2026-1a',
            code: '1A',
            name: '1º Ano A',
            academicYear: 2026,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          }),
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'class-2026-1a',
              code: '1A',
              name: '1º Ano A',
              academicYear: 2026,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            },
          ]),
          upsert: vi.fn().mockResolvedValue({}),
        },
      } as unknown as PrismaClient;

      const repo = new PrismaClassGroupRepository(mockPrisma);

      const found = await repo.findByCodeAndYear(' 1a ', 2026);
      expect(found).not.toBeNull();
      expect(found?.code).toBe('1A');
      expect(found?.academicYear).toBe(2026);
      expect(mockPrisma.classGroup.findUnique).toHaveBeenCalledWith({
        where: {
          code_academicYear: {
            code: '1A',
            academicYear: 2026,
          },
        },
      });

      const list = await repo.findAll({ onlyActive: true, academicYear: 2026 });
      expect(list).toHaveLength(1);
      expect(mockPrisma.classGroup.findMany).toHaveBeenCalledWith({
        where: { isActive: true, academicYear: 2026 },
        orderBy: [{ academicYear: 'desc' }, { code: 'asc' }],
      });

      const newClass = ClassGroup.create({
        id: 'class-2027-1a',
        code: '1a',
        name: '1º Ano A',
        academicYear: 2027,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await repo.save(newClass);
      expect(mockPrisma.classGroup.upsert).toHaveBeenCalledWith({
        where: { id: 'class-2027-1a' },
        create: {
          id: 'class-2027-1a',
          code: '1A',
          name: '1º Ano A',
          academicYear: 2027,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          code: '1A',
          name: '1º Ano A',
          academicYear: 2027,
          isActive: true,
          updatedAt: now,
        },
      });
    });
  });
});

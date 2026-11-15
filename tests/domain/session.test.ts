import { ClassSession } from '@server/domain/entities/ClassSession';
import { SessionStatus } from '@shared/enums';
import { describe, expect, it } from 'vitest';

describe('Domain Seam: ClassSession Entity', () => {
  it('creates an ACTIVE ClassSession with default 50-minute duration and 10-minute exit limit', () => {
    const startedAt = new Date('2026-03-10T08:00:00.000Z');
    const session = ClassSession.create({
      id: 'session-1',
      teacherId: 'teacher-1',
      teacherName: 'Prof. Carlos Eduardo',
      classCode: '1A',
      subject: 'Matemática',
      startedAt,
    });

    expect(session.id).toBe('session-1');
    expect(session.teacherId).toBe('teacher-1');
    expect(session.teacherName).toBe('Prof. Carlos Eduardo');
    expect(session.roomId).toBe('SALA-01');
    expect(session.classCode).toBe('1A');
    expect(session.className).toBe('1A');
    expect(session.subject).toBe('Matemática');
    expect(session.status).toBe(SessionStatus.ACTIVE);
    expect(session.startedAt).toEqual(startedAt);
    expect(session.startTime).toEqual(startedAt);
    expect(session.endedAt).toBeUndefined();
    expect(session.endTime).toBeUndefined();
    expect(session.plannedDurationMinutes).toBe(50);
    expect(session.defaultTimeLimitMinutes).toBe(10);
    expect(session.timeLimitMinutes).toBe(10);
    expect(session.isActive()).toBe(true);
  });

  it('rejects creation when classCode or subject is empty', () => {
    expect(() =>
      ClassSession.create({
        teacherId: 'teacher-1',
        teacherName: 'Prof. Carlos',
        classCode: '   ',
        subject: 'Matemática',
      }),
    ).toThrow(/turma/i);

    expect(() =>
      ClassSession.create({
        teacherId: 'teacher-1',
        teacherName: 'Prof. Carlos',
        classCode: '1A',
        subject: '',
      }),
    ).toThrow(/disciplina/i);
  });

  it('calculates elapsed minutes and transitions from ACTIVE to ENDED when ended', () => {
    const startedAt = new Date('2026-03-10T08:00:00.000Z');
    const session = ClassSession.create({
      id: 'session-2',
      teacherId: 'teacher-1',
      teacherName: 'Prof. Carlos Eduardo',
      roomId: 'SALA-02',
      classCode: '2B',
      subject: 'Física',
      startedAt,
    });

    const midPoint = new Date('2026-03-10T08:25:00.000Z');
    expect(session.getElapsedMinutes(midPoint)).toBe(25);

    const endedAt = new Date('2026-03-10T08:50:00.000Z');
    session.end(endedAt);

    expect(session.status).toBe(SessionStatus.ENDED);
    expect(session.isActive()).toBe(false);
    expect(session.endedAt).toEqual(endedAt);
    expect(session.endTime).toEqual(endedAt);
    expect(
      session.getElapsedMinutes(new Date('2026-03-10T09:30:00.000Z')),
    ).toBe(50);

    // Cannot end an already ended session
    expect(() => session.end(new Date('2026-03-10T09:00:00.000Z'))).toThrow(
      /encerrada/i,
    );
  });
});

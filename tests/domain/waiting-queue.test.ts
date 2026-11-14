import { describe, it, expect } from 'vitest';
import { WaitingQueueEntry } from '@server/domain/entities/WaitingQueueEntry';
import { QueueEntryStatus } from '@shared/enums';

describe('Domain Seam: WaitingQueueEntry FIFO & 2-Minute Confirmation Window', () => {
  it('creates a WaitingQueueEntry in WAITING status with LGPD abbreviated name and validates required properties', () => {
    const requestedAt = new Date('2026-03-10T08:12:00.000Z');
    const entry = WaitingQueueEntry.create({
      id: 'queue-1',
      sessionId: 'session-1',
      studentRa: '1002',
      studentFullName: 'João Mendes',
      position: 1,
      requestedAt,
    });

    expect(entry.id).toBe('queue-1');
    expect(entry.sessionId).toBe('session-1');
    expect(entry.studentRa).toBe('1002');
    expect(entry.studentFullName).toBe('João Mendes');
    expect(entry.studentPublicName).toBe('João M.');
    expect(entry.abbreviatedName).toBe('João M.');
    expect(entry.position).toBe(1);
    expect(entry.status).toBe(QueueEntryStatus.WAITING);
    expect(entry.requestedAt).toEqual(requestedAt);
    expect(entry.calledAt).toBeUndefined();
    expect(entry.expiresAt).toBeUndefined();
    expect(entry.isActive()).toBe(true);

    expect(() =>
      WaitingQueueEntry.create({
        sessionId: '',
        studentRa: '1002',
        studentFullName: 'João Mendes',
        position: 1,
      })
    ).toThrow(/sessionId/i);

    expect(() =>
      WaitingQueueEntry.create({
        sessionId: 'session-1',
        studentRa: '   ',
        studentFullName: 'João Mendes',
        position: 1,
      })
    ).toThrow(/studentRa|RA/i);

    expect(() =>
      WaitingQueueEntry.create({
        sessionId: 'session-1',
        studentRa: '1002',
        studentFullName: '   ',
        position: 1,
      })
    ).toThrow(/nome/i);
  });

  it('starts a 2-minute confirmation window on callSlot and allows claiming within the 2-minute limit', () => {
    const requestedAt = new Date('2026-03-10T08:12:00.000Z');
    const calledAt = new Date('2026-03-10T08:15:00.000Z');
    const entry = WaitingQueueEntry.create({
      id: 'queue-1',
      sessionId: 'session-1',
      studentRa: '1002',
      studentFullName: 'João Mendes',
      position: 1,
      requestedAt,
    });

    entry.callSlot(calledAt, 2);

    expect(entry.status).toBe(QueueEntryStatus.CALLED);
    expect(entry.calledAt).toEqual(calledAt);
    expect(entry.expiresAt).toEqual(new Date('2026-03-10T08:17:00.000Z'));
    expect(entry.isActive()).toBe(true);

    // 1 minute into the 2-minute window -> 60 seconds left, not expired
    const oneMinuteLater = new Date('2026-03-10T08:16:00.000Z');
    expect(entry.isExpired(oneMinuteLater)).toBe(false);
    expect(entry.getRemainingConfirmationSeconds(oneMinuteLater)).toBe(60);

    // Exactly at 2 minutes (08:17:00.000Z) -> still valid (not > expiresAt)
    const exactBoundary = new Date('2026-03-10T08:17:00.000Z');
    expect(entry.isExpired(exactBoundary)).toBe(false);

    // Claim within window
    entry.claim(oneMinuteLater);
    expect(entry.status).toBe(QueueEntryStatus.CLAIMED);
    expect(entry.isActive()).toBe(false);

    // Cannot claim twice
    expect(() => entry.claim(oneMinuteLater)).toThrow(/ativa|confirmad|encerrad/i);
  });

  it('detects expiration after 2 minutes, rejects claiming an expired slot, and supports voluntary cancellation', () => {
    const calledAt = new Date('2026-03-10T08:15:00.000Z');
    const expiredEntry = WaitingQueueEntry.create({
      id: 'queue-exp',
      sessionId: 'session-1',
      studentRa: '1002',
      studentFullName: 'João Mendes',
      position: 1,
    });

    expiredEntry.callSlot(calledAt, 2);

    // 2 minutes and 1 second later -> expired
    const afterTwoMinutes = new Date('2026-03-10T08:17:01.000Z');
    expect(expiredEntry.isExpired(afterTwoMinutes)).toBe(true);
    expect(expiredEntry.getRemainingConfirmationSeconds(afterTwoMinutes)).toBe(0);

    // Attempting to claim after expiration throws and marks entry EXPIRED
    expect(() => expiredEntry.claim(afterTwoMinutes)).toThrow(/expir/i);
    expect(expiredEntry.status).toBe(QueueEntryStatus.EXPIRED);
    expect(expiredEntry.isActive()).toBe(false);

    // Voluntary cancellation
    const cancelledEntry = WaitingQueueEntry.create({
      id: 'queue-cancel',
      sessionId: 'session-1',
      studentRa: '1003',
      studentFullName: 'Ana Costa',
      position: 2,
    });

    cancelledEntry.cancel();
    expect(cancelledEntry.status).toBe(QueueEntryStatus.CANCELLED);
    expect(cancelledEntry.isActive()).toBe(false);
    expect(() => cancelledEntry.cancel()).toThrow(/cancelar|encerrad/i);
  });
});

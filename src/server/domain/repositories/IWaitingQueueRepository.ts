import type { WaitingQueueEntry } from '../entities/WaitingQueueEntry';

export interface IWaitingQueueRepository {
  save(entry: WaitingQueueEntry): Promise<void>;
  update(entry: WaitingQueueEntry): Promise<void>;
  findById(id: string): Promise<WaitingQueueEntry | null>;
  findActiveBySessionId(sessionId: string): Promise<WaitingQueueEntry[]>;
  findActiveByStudentRa(
    ra: string,
    sessionId?: string,
  ): Promise<WaitingQueueEntry | null>;
  findBySessionId(sessionId: string): Promise<WaitingQueueEntry[]>;
}

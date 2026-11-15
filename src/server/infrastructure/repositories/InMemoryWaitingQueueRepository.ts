import type { WaitingQueueEntry } from '@server/domain/entities/WaitingQueueEntry';
import type { IWaitingQueueRepository } from '@server/domain/repositories/IWaitingQueueRepository';

export class InMemoryWaitingQueueRepository implements IWaitingQueueRepository {
  private entries: Map<string, WaitingQueueEntry> = new Map();

  public async save(entry: WaitingQueueEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  public async update(entry: WaitingQueueEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  public async findById(id: string): Promise<WaitingQueueEntry | null> {
    return this.entries.get(id) ?? null;
  }

  public async findActiveBySessionId(
    sessionId: string,
  ): Promise<WaitingQueueEntry[]> {
    const active = Array.from(this.entries.values())
      .filter((e) => e.sessionId === sessionId && e.isActive())
      .sort(
        (a, b) =>
          a.requestedAt.getTime() - b.requestedAt.getTime() ||
          a.position - b.position,
      );

    active.forEach((entry, index) => {
      entry.setPosition(index + 1);
    });

    return active;
  }

  public async findActiveByStudentRa(
    ra: string,
    sessionId?: string,
  ): Promise<WaitingQueueEntry | null> {
    const normalizedRa = ra.trim();
    for (const entry of this.entries.values()) {
      if (
        entry.studentRa === normalizedRa &&
        entry.isActive() &&
        (!sessionId || entry.sessionId === sessionId)
      ) {
        return entry;
      }
    }
    return null;
  }

  public async findBySessionId(
    sessionId: string,
  ): Promise<WaitingQueueEntry[]> {
    return Array.from(this.entries.values()).filter(
      (e) => e.sessionId === sessionId,
    );
  }
}

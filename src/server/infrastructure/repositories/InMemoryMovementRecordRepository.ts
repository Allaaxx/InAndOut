import { MovementRecord } from '@server/domain/entities/MovementRecord';
import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';

export class InMemoryMovementRecordRepository
  implements IMovementRecordRepository
{
  private records: Map<string, MovementRecord> = new Map();

  public async save(record: MovementRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  public async update(record: MovementRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  public async findById(id: string): Promise<MovementRecord | null> {
    return this.records.get(id) ?? null;
  }

  public async findActiveBySessionId(
    sessionId: string
  ): Promise<MovementRecord[]> {
    return Array.from(this.records.values()).filter(
      (r) => r.sessionId === sessionId && r.isActive()
    );
  }

  public async findActiveByStudentRa(
    ra: string,
    sessionId?: string
  ): Promise<MovementRecord | null> {
    const normalizedRa = ra.trim();
    for (const record of this.records.values()) {
      if (
        record.studentRa === normalizedRa &&
        record.isActive() &&
        (!sessionId || record.sessionId === sessionId)
      ) {
        return record;
      }
    }
    return null;
  }

  public async findBySessionId(sessionId: string): Promise<MovementRecord[]> {
    return Array.from(this.records.values()).filter(
      (r) => r.sessionId === sessionId
    );
  }

  public async findByStudentRa(ra: string): Promise<MovementRecord[]> {
    const normalizedRa = ra.trim();
    return Array.from(this.records.values()).filter(
      (r) => r.studentRa === normalizedRa
    );
  }

  public async findAllActive(): Promise<MovementRecord[]> {
    return Array.from(this.records.values()).filter((r) => r.isActive());
  }

  public async findAll(): Promise<MovementRecord[]> {
    return Array.from(this.records.values());
  }
}

import type { MovementRecord } from '../entities/MovementRecord';

export interface IMovementRecordRepository {
  save(record: MovementRecord): Promise<void>;
  update(record: MovementRecord): Promise<void>;
  findById(id: string): Promise<MovementRecord | null>;
  findActiveBySessionId(sessionId: string): Promise<MovementRecord[]>;
  findActiveByStudentRa(
    ra: string,
    sessionId?: string,
  ): Promise<MovementRecord | null>;
  findBySessionId(sessionId: string): Promise<MovementRecord[]>;
  findByStudentRa(ra: string): Promise<MovementRecord[]>;
  findAllActive(): Promise<MovementRecord[]>;
  findAll(): Promise<MovementRecord[]>;
}

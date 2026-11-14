import { ClassSession } from '../entities/ClassSession';

export interface IClassSessionRepository {
  create(session: ClassSession): Promise<void>;
  save(session: ClassSession): Promise<void>;
  update(session: ClassSession): Promise<void>;
  findById(id: string): Promise<ClassSession | null>;
  findActiveByRoomId(roomId: string): Promise<ClassSession | null>;
  findActiveByTeacherId(teacherId: string): Promise<ClassSession | null>;
  findAllActive(): Promise<ClassSession[]>;
  findAll(): Promise<ClassSession[]>;
}

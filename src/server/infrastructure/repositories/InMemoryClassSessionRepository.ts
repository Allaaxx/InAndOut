import { ClassSession } from '@server/domain/entities/ClassSession';
import { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import { SessionStatus } from '@shared/enums';

export class InMemoryClassSessionRepository implements IClassSessionRepository {
  private sessions = new Map<string, ClassSession>();

  public async create(session: ClassSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  public async save(session: ClassSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  public async update(session: ClassSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  public async findById(id: string): Promise<ClassSession | null> {
    return this.sessions.get(id) ?? null;
  }

  public async findActiveByRoomId(roomId: string): Promise<ClassSession | null> {
    const normalizedRoom = roomId.trim() || 'SALA-01';
    for (const session of this.sessions.values()) {
      if (
        session.roomId === normalizedRoom &&
        session.status === SessionStatus.ACTIVE
      ) {
        return session;
      }
    }
    return null;
  }

  public async findActiveByTeacherId(
    teacherId: string
  ): Promise<ClassSession | null> {
    for (const session of this.sessions.values()) {
      if (
        session.teacherId === teacherId &&
        session.status === SessionStatus.ACTIVE
      ) {
        return session;
      }
    }
    return null;
  }

  public async findAllActive(): Promise<ClassSession[]> {
    const active: ClassSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.status === SessionStatus.ACTIVE) {
        active.push(session);
      }
    }
    return active;
  }

  public async findAll(): Promise<ClassSession[]> {
    return Array.from(this.sessions.values());
  }
}

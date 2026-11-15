import { createHash } from 'node:crypto';
import { User } from '@server/domain/entities/User';
import { IUserRepository } from '@server/domain/repositories/IUserRepository';
import { UserRole } from '@shared/enums';

export function hashPassword(plain: string): string {
  return createHash('sha256').update(`inandout-salt:${plain}`).digest('hex');
}

export function verifyPassword(plain: string, passwordHash: string): boolean {
  return hashPassword(plain) === passwordHash;
}

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  constructor(initialUsers?: User[]) {
    const defaults = initialUsers ?? [
      User.create({
        id: 'teacher-1',
        name: 'Prof. Carlos Eduardo',
        email: 'prof@linsdorego.edu.br',
        passwordHash: hashPassword('senha123'),
        role: UserRole.TEACHER,
        pinCode: '1234',
      }),
      User.create({
        id: 'coord-1',
        name: 'Coord. Mariana Alves',
        email: 'coord@linsdorego.edu.br',
        passwordHash: hashPassword('coord123'),
        role: UserRole.COORDINATOR,
        pinCode: '9999',
      }),
      User.create({
        id: 'admin-1',
        name: 'Dir. Roberto Lins',
        email: 'admin@linsdorego.edu.br',
        passwordHash: hashPassword('admin123'),
        role: UserRole.ADMIN,
        pinCode: '0000',
      }),
    ];

    for (const user of defaults) {
      this.users.set(user.id, user);
    }
  }

  public async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === normalized) {
        return user;
      }
    }
    return null;
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  public async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}

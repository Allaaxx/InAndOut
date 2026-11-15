import type { PrismaClient, User as PrismaUserModel } from '@prisma/client';
import { User } from '@server/domain/entities/User';
import type { IUserRepository } from '@server/domain/repositories/IUserRepository';
import { getPrismaClient } from '@server/infrastructure/database/prismaClient';
import type { UserRole } from '@shared/enums';

export class PrismaUserRepository implements IUserRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? getPrismaClient();
  }

  public async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    const row = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    return row ? this.toDomain(row) : null;
  }

  public async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
    });
    return row ? this.toDomain(row) : null;
  }

  public async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        name: user.name,
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        role: user.role,
        pinCodeHash: user.pinCode.value,
      },
      update: {
        name: user.name,
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        role: user.role,
        pinCodeHash: user.pinCode.value,
      },
    });
  }

  private toDomain(row: PrismaUserModel): User {
    return User.create({
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role as UserRole,
      pinCode: row.pinCodeHash,
    });
  }
}

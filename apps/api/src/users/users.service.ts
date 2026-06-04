import { Injectable } from '@nestjs/common';
import { prisma, User } from '@hone/database';

@Injectable()
export class UsersService {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  create(data: { email: string; passwordHash: string; name: string; emailVerifyToken?: string }): Promise<User> {
    return prisma.user.create({ data });
  }

  findById(id: string): Promise<Omit<User, 'passwordHash' | 'deletedAt'> | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<Omit<User, 'passwordHash' | 'deletedAt'> | null>;
  }
}

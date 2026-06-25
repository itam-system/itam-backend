import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import { parseExpiryToMs } from '../common/utils/date.util.js';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRefreshToken(
    userId: string,
    token: string,
    expiry: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + parseExpiryToMs(expiry));
    await this.prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async findRefreshToken(token: string) {
    return this.prisma.refreshToken.findUnique({
      where: { token },
    });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

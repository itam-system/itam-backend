import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/database/prisma.service.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ErrorCodes } from '../common/constants/error-codes.constant.js';
import { hashPassword, comparePassword } from '../common/utils/hash.util.js';
import { ActivityAction } from '../common/enums/activity-action.enum.js';
import { AuthRepository } from './auth.repository.js';
import type { TokenPair } from './types/token-pair.type.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import type { ActiveUser } from '../common/interfaces/active-user.interface.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {}

  // ─────────────────────────────────────────────
  // Get Current User Profile
  // ─────────────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        department: true,
        position: true,
        avatar: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new BusinessException(
        ErrorCodes.USER_NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const role = await this.prisma.role.findUnique({
      where: { id: user.roleId },
    });

    const permissionSlugs: string[] = [];
    if (role) {
      const permissions = await this.prisma.permission.findMany({
        where: {
          id: { in: role.permissionIds },
          isDeleted: false,
        },
        select: { slug: true },
      });
      permissionSlugs.push(...permissions.map((p) => p.slug));
    }

    return {
      user: {
        ...user,
        role: role
          ? { id: role.id, name: role.name, description: role.description }
          : null,
      },
      permissions: permissionSlugs,
    };
  }

  // ─────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ tokens: TokenPair; user: object }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isDeleted: false },
    });

    if (!user) {
      throw new BusinessException(
        ErrorCodes.INVALID_CREDENTIALS,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!user.isActive) {
      throw new BusinessException(
        ErrorCodes.ACCOUNT_INACTIVE,
        'Your account is inactive. Please contact an administrator',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await comparePassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new BusinessException(
        ErrorCodes.INVALID_CREDENTIALS,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokens = await this.generateTokenPair(user.id, user.email, user.roleId);

    // Log the login activity
    await this.logActivity(
      user.id,
      ActivityAction.LOGIN,
      'auth',
      user.id,
      `${user.firstName} ${user.lastName}`,
      ipAddress,
      userAgent,
    );

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId: user.employeeId,
        roleId: user.roleId,
      },
    };
  }

  // ─────────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────────
  async logout(
    currentUser: ActiveUser,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.authRepository.revokeRefreshToken(refreshToken);

    await this.logActivity(
      currentUser.userId,
      ActivityAction.LOGOUT,
      'auth',
      currentUser.userId,
      currentUser.email,
      ipAddress,
      userAgent,
    );
  }

  // ─────────────────────────────────────────────
  // Refresh Tokens (rotation)
  // ─────────────────────────────────────────────
  async refreshTokens(
    userId: string,
    email: string,
    roleId: string,
    incomingRefreshToken: string,
  ): Promise<TokenPair> {
    const tokenRecord = await this.authRepository.findRefreshToken(incomingRefreshToken);

    if (!tokenRecord) {
      throw new BusinessException(
        ErrorCodes.REFRESH_TOKEN_INVALID,
        'Refresh token not found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (tokenRecord.isRevoked) {
      // Potential token reuse — revoke all tokens for this user
      await this.authRepository.revokeAllUserTokens(userId);
      throw new BusinessException(
        ErrorCodes.REFRESH_TOKEN_REVOKED,
        'Refresh token has been revoked',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BusinessException(
        ErrorCodes.REFRESH_TOKEN_EXPIRED,
        'Refresh token has expired',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Revoke the old token (rotation)
    await this.authRepository.revokeRefreshToken(incomingRefreshToken);

    // Issue a new token pair
    return this.generateTokenPair(userId, email, roleId);
  }

  // ─────────────────────────────────────────────
  // Change Password
  // ─────────────────────────────────────────────
  async changePassword(
    currentUser: ActiveUser,
    dto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BusinessException(
        ErrorCodes.PASSWORD_MISMATCH,
        'New password and confirm password do not match',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user) {
      throw new BusinessException(
        ErrorCodes.USER_NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const isCurrentPasswordValid = await comparePassword(dto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BusinessException(
        ErrorCodes.INVALID_CREDENTIALS,
        'Current password is incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isSamePassword = await comparePassword(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BusinessException(
        ErrorCodes.SAME_PASSWORD,
        'New password cannot be the same as the current password',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashed = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: currentUser.userId },
      data: { password: hashed },
    });

    // Revoke all refresh tokens after password change
    await this.authRepository.revokeAllUserTokens(currentUser.userId);

    await this.logActivity(
      currentUser.userId,
      ActivityAction.CHANGE_PASSWORD,
      'auth',
      currentUser.userId,
      user.email,
      ipAddress,
      userAgent,
    );
  }

  // ─────────────────────────────────────────────
  // Forgot Password (V1 — structure only)
  // ─────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    // V1: Always returns success to prevent user enumeration
    // V2: Send password reset email with token
    const _user = await this.prisma.user.findFirst({
      where: { email: dto.email, isDeleted: false },
    });

    return {
      message: 'If an account with that email exists, a reset link has been sent.',
    };
  }

  // ─────────────────────────────────────────────
  // Reset Password (V1 — structure only)
  // ─────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BusinessException(
        ErrorCodes.PASSWORD_MISMATCH,
        'New password and confirm password do not match',
        HttpStatus.BAD_REQUEST,
      );
    }

    // V2: Validate reset token, update password, revoke all tokens
    return {
      message:
        'Password reset is not yet fully implemented. Please contact an administrator.',
    };
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  private async generateTokenPair(
    userId: string,
    email: string,
    roleId: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, roleId };

    const accessSecret = this.configService.get<string>('jwt.accessSecret', 'access-secret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret', 'refresh-secret');
    const accessExpiry = this.configService.get<string>('jwt.accessExpiry', '15m');
    const refreshExpiry = this.configService.get<string>('jwt.refreshExpiry', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as object, {
        secret: accessSecret,
        expiresIn: accessExpiry as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
      this.jwtService.signAsync(payload as object, {
        secret: refreshSecret,
        expiresIn: refreshExpiry as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
    ]);

    // Store refresh token in DB for rotation tracking
    await this.authRepository.createRefreshToken(userId, refreshToken, refreshExpiry);

    return { accessToken, refreshToken };
  }

  private async logActivity(
    userId: string,
    action: ActivityAction,
    module: string,
    entityId: string,
    entityName: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        userId,
        action,
        module,
        entityId,
        entityName,
        ipAddress,
        userAgent,
      },
    });
  }
}

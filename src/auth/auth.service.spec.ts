import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ErrorCodes } from '../common/constants/error-codes.constant.js';
import { ActivityAction } from '../common/enums/activity-action.enum.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { createMockPrisma, mockUser, MockPrisma } from '../test-utils/prisma-mock.js';
import { comparePassword, hashPassword } from '../common/utils/hash.util.js';
import type { ActiveUser } from '../common/interfaces/active-user.interface.js';
import type { TokenPair } from './types/token-pair.type.js';

jest.mock('../common/utils/hash.util.js');

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: MockPrisma;
  let mockJwtService: { signAsync: jest.Mock };
  let mockConfigService: { get: jest.Mock };
  let mockAuthRepository: {
    createRefreshToken: jest.Mock;
    findRefreshToken: jest.Mock;
    revokeRefreshToken: jest.Mock;
    revokeAllUserTokens: jest.Mock;
  };

  const mockActiveUser: ActiveUser = {
    userId: 'user-1',
    email: 'john@example.com',
    roleId: 'role-1',
  };

  const defaultConfig = {
    'jwt.accessSecret': 'test-access-secret',
    'jwt.refreshSecret': 'test-refresh-secret',
    'jwt.accessExpiry': '15m',
    'jwt.refreshExpiry': '7d',
  };

  beforeEach(async () => {
    const { mockPrisma: prismaMock } = createMockPrisma();
    mockPrisma = prismaMock;

    mockJwtService = {
      signAsync: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue: string) =>
        (defaultConfig as Record<string, string>)[key] ?? defaultValue,
      ),
    };

    mockAuthRepository = {
      createRefreshToken: jest.fn(),
      findRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthRepository, useValue: mockAuthRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // getMe
  // ─────────────────────────────────────────────
  describe('getMe', () => {
    it('should return user with role and permissions when user exists and role is found', async () => {
      const user = mockUser();
      const role = {
        id: 'role-1',
        name: 'Admin',
        description: 'Administrator',
        permissionIds: ['perm-1', 'perm-2'],
        isSystem: false,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const permissions = [
        { slug: 'users.create' },
        { slug: 'users.read' },
      ];

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.role.findUnique.mockResolvedValue(role);
      mockPrisma.permission.findMany.mockResolvedValue(permissions);

      const result = await service.getMe('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1', isDeleted: false },
        select: expect.objectContaining({ id: true, roleId: true }),
      });
      expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: user.roleId },
      });
      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        where: { id: { in: role.permissionIds }, isDeleted: false },
        select: { slug: true },
      });
      expect(result.user).toEqual(
        expect.objectContaining({
          id: user.id,
          email: user.email,
          role: { id: role.id, name: role.name, description: role.description },
        }),
      );
      expect(result.permissions).toEqual(['users.create', 'users.read']);
    });

    it('should return user with null role and empty permissions when role is not found', async () => {
      const user = mockUser();

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.role.findUnique.mockResolvedValue(null);

      const result = await service.getMe('user-1');

      expect(result.user.role).toBeNull();
      expect(result.permissions).toEqual([]);
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('non-existent')).rejects.toThrow(
        new BusinessException(
          ErrorCodes.USER_NOT_FOUND,
          'User not found',
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  // ─────────────────────────────────────────────
  // login
  // ─────────────────────────────────────────────
  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'correct-password',
    };

    function setupJwtMocks() {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
    }

    it('should return tokens and user when credentials are valid and account is active', async () => {
      const user = mockUser();

      mockPrisma.user.findFirst.mockResolvedValue(user);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      setupJwtMocks();
      mockPrisma.activityLog.create.mockResolvedValue(undefined);

      const result = await service.login(loginDto, '127.0.0.1', 'test-agent');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: loginDto.email, isDeleted: false },
      });
      expect(comparePassword).toHaveBeenCalledWith(loginDto.password, user.password);
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockAuthRepository.createRefreshToken).toHaveBeenCalledWith(
        user.id,
        'refresh-token',
        '7d',
      );
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,
          action: ActivityAction.LOGIN,
          module: 'auth',
          entityId: user.id,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      });
      expect(result.tokens).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(result.user).toEqual({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId: user.employeeId,
        roleId: user.roleId,
      });
    });

    it('should throw INVALID_CREDENTIALS when email is not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new BusinessException(
          ErrorCodes.INVALID_CREDENTIALS,
          'Invalid email or password',
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should throw ACCOUNT_INACTIVE when user account is inactive', async () => {
      const inactiveUser = mockUser({ isActive: false });

      mockPrisma.user.findFirst.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        new BusinessException(
          ErrorCodes.ACCOUNT_INACTIVE,
          'Your account is inactive. Please contact an administrator',
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should throw INVALID_CREDENTIALS when password is wrong', async () => {
      const user = mockUser();

      mockPrisma.user.findFirst.mockResolvedValue(user);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new BusinessException(
          ErrorCodes.INVALID_CREDENTIALS,
          'Invalid email or password',
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should work without optional ipAddress and userAgent parameters', async () => {
      const user = mockUser();

      mockPrisma.user.findFirst.mockResolvedValue(user);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      setupJwtMocks();
      mockPrisma.activityLog.create.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: undefined,
          userAgent: undefined,
        }),
      });
      expect(result.tokens.accessToken).toBe('access-token');
    });
  });

  // ─────────────────────────────────────────────
  // logout
  // ─────────────────────────────────────────────
  describe('logout', () => {
    it('should revoke the refresh token and log logout activity', async () => {
      mockAuthRepository.revokeRefreshToken.mockResolvedValue(undefined);
      mockPrisma.activityLog.create.mockResolvedValue(undefined);

      await service.logout(mockActiveUser, 'some-refresh-token', '192.168.1.1', 'Chrome');

      expect(mockAuthRepository.revokeRefreshToken).toHaveBeenCalledWith('some-refresh-token');
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockActiveUser.userId,
          action: ActivityAction.LOGOUT,
          module: 'auth',
          entityId: mockActiveUser.userId,
          entityName: mockActiveUser.email,
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome',
        },
      });
    });

    it('should work without optional parameters', async () => {
      mockAuthRepository.revokeRefreshToken.mockResolvedValue(undefined);
      mockPrisma.activityLog.create.mockResolvedValue(undefined);

      await service.logout(mockActiveUser, 'some-refresh-token');

      expect(mockAuthRepository.revokeRefreshToken).toHaveBeenCalledWith('some-refresh-token');
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: undefined,
          userAgent: undefined,
        }),
      });
    });
  });

  // ─────────────────────────────────────────────
  // refreshTokens
  // ─────────────────────────────────────────────
  describe('refreshTokens', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const pastDate = new Date(Date.now() - 60 * 1000);

    const validTokenRecord = {
      id: 'rt-1',
      token: 'valid-refresh-token',
      userId: 'user-1',
      isRevoked: false,
      expiresAt: futureDate,
      createdAt: new Date(),
    };

    const revokedTokenRecord = {
      ...validTokenRecord,
      token: 'revoked-refresh-token',
      isRevoked: true,
    };

    const expiredTokenRecord = {
      ...validTokenRecord,
      token: 'expired-refresh-token',
      expiresAt: pastDate,
    };

    function setupJwtMocks() {
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
    }

    it('should revoke old token and return a new token pair when token is valid', async () => {
      mockAuthRepository.findRefreshToken.mockResolvedValue(validTokenRecord);
      mockAuthRepository.revokeRefreshToken.mockResolvedValue(undefined);
      setupJwtMocks();

      const result = await service.refreshTokens(
        'user-1',
        'john@example.com',
        'role-1',
        'valid-refresh-token',
      );

      expect(mockAuthRepository.findRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockAuthRepository.revokeRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockAuthRepository.createRefreshToken).toHaveBeenCalledWith(
        'user-1',
        'new-refresh-token',
        '7d',
      );
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw REFRESH_TOKEN_INVALID when token record is not found', async () => {
      mockAuthRepository.findRefreshToken.mockResolvedValue(null);

      await expect(
        service.refreshTokens('user-1', 'john@example.com', 'role-1', 'unknown-token'),
      ).rejects.toThrow(
        new BusinessException(
          ErrorCodes.REFRESH_TOKEN_INVALID,
          'Refresh token not found',
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should throw REFRESH_TOKEN_REVOKED and revoke all user tokens when token is already revoked', async () => {
      mockAuthRepository.findRefreshToken.mockResolvedValue(revokedTokenRecord);
      mockAuthRepository.revokeAllUserTokens.mockResolvedValue(undefined);

      await expect(
        service.refreshTokens('user-1', 'john@example.com', 'role-1', 'revoked-refresh-token'),
      ).rejects.toThrow(
        new BusinessException(
          ErrorCodes.REFRESH_TOKEN_REVOKED,
          'Refresh token has been revoked',
          HttpStatus.UNAUTHORIZED,
        ),
      );

      expect(mockAuthRepository.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('should throw REFRESH_TOKEN_EXPIRED when token has expired', async () => {
      mockAuthRepository.findRefreshToken.mockResolvedValue(expiredTokenRecord);

      await expect(
        service.refreshTokens('user-1', 'john@example.com', 'role-1', 'expired-refresh-token'),
      ).rejects.toThrow(
        new BusinessException(
          ErrorCodes.REFRESH_TOKEN_EXPIRED,
          'Refresh token has expired',
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });
  });

  // ─────────────────────────────────────────────
  // changePassword
  // ─────────────────────────────────────────────
  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'OldPass1',
      newPassword: 'NewPass1',
      confirmPassword: 'NewPass1',
    };

    it('should update password, revoke all tokens, and log activity when all validations pass', async () => {
      const user = mockUser();

      mockPrisma.user.findUnique.mockResolvedValue(user);
      (comparePassword as jest.Mock)
        .mockResolvedValueOnce(true)  // current password valid
        .mockResolvedValueOnce(false); // new password is different
      (hashPassword as jest.Mock).mockResolvedValue('new-hashed-password');
      mockPrisma.user.update.mockResolvedValue(user);
      mockAuthRepository.revokeAllUserTokens.mockResolvedValue(undefined);
      mockPrisma.activityLog.create.mockResolvedValue(undefined);

      await service.changePassword(mockActiveUser, changePasswordDto, '10.0.0.1', 'Firefox');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockActiveUser.userId },
      });
      expect(comparePassword).toHaveBeenNthCalledWith(
        1,
        changePasswordDto.currentPassword,
        user.password,
      );
      expect(comparePassword).toHaveBeenNthCalledWith(
        2,
        changePasswordDto.newPassword,
        user.password,
      );
      expect(hashPassword).toHaveBeenCalledWith(changePasswordDto.newPassword);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockActiveUser.userId },
        data: { password: 'new-hashed-password' },
      });
      expect(mockAuthRepository.revokeAllUserTokens).toHaveBeenCalledWith(mockActiveUser.userId);
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockActiveUser.userId,
          action: ActivityAction.CHANGE_PASSWORD,
          module: 'auth',
          entityId: mockActiveUser.userId,
          entityName: user.email,
          ipAddress: '10.0.0.1',
          userAgent: 'Firefox',
        },
      });
    });

    it('should throw PASSWORD_MISMATCH when newPassword and confirmPassword do not match', async () => {
      const mismatchedDto: ChangePasswordDto = {
        currentPassword: 'OldPass1',
        newPassword: 'NewPass1',
        confirmPassword: 'DifferentPass1',
      };

      await expect(
        service.changePassword(mockActiveUser, mismatchedDto),
      ).rejects.toThrow(
        new BusinessException(
          ErrorCodes.PASSWORD_MISMATCH,
          'New password and confirm password do not match',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(mockActiveUser, changePasswordDto),
      ).rejects.toThrow(
        new BusinessException(
          ErrorCodes.USER_NOT_FOUND,
          'User not found',
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw INVALID_CREDENTIALS when current password is incorrect', async () => {
      const user = mockUser();

      mockPrisma.user.findUnique.mockResolvedValue(user);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(mockActiveUser, changePasswordDto),
      ).rejects.toThrow(
        new BusinessException(
          ErrorCodes.INVALID_CREDENTIALS,
          'Current password is incorrect',
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should throw SAME_PASSWORD when new password equals current password', async () => {
      const user = mockUser();

      mockPrisma.user.findUnique.mockResolvedValue(user);
      (comparePassword as jest.Mock)
        .mockResolvedValueOnce(true) // current password valid
        .mockResolvedValueOnce(true); // new password is same as current

      await expect(
        service.changePassword(mockActiveUser, changePasswordDto),
      ).rejects.toThrow(
        new BusinessException(
          ErrorCodes.SAME_PASSWORD,
          'New password cannot be the same as the current password',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  // ─────────────────────────────────────────────
  // forgotPassword
  // ─────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('should always return a success message regardless of whether user exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser());

      const result = await service.forgotPassword({ email: 'john@example.com' } as ForgotPasswordDto);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'john@example.com', isDeleted: false },
      });
      expect(result).toEqual({
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    });

    it('should return success message even when user is not found (prevent enumeration)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'unknown@example.com' } as ForgotPasswordDto);

      expect(result).toEqual({
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    });
  });

  // ─────────────────────────────────────────────
  // resetPassword
  // ─────────────────────────────────────────────
  describe('resetPassword', () => {
    it('should throw PASSWORD_MISMATCH when newPassword and confirmPassword do not match', async () => {
      const dto: ResetPasswordDto = {
        token: 'some-token',
        newPassword: 'NewPass1',
        confirmPassword: 'DifferentPass1',
      };

      await expect(service.resetPassword(dto)).rejects.toThrow(
        new BusinessException(
          ErrorCodes.PASSWORD_MISMATCH,
          'New password and confirm password do not match',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should return a not-yet-implemented message when passwords match', async () => {
      const dto: ResetPasswordDto = {
        token: 'some-token',
        newPassword: 'NewPass1',
        confirmPassword: 'NewPass1',
      };

      const result = await service.resetPassword(dto);

      expect(result).toEqual({
        message:
          'Password reset is not yet fully implemented. Please contact an administrator.',
      });
    });
  });

  // ─────────────────────────────────────────────
  // generateTokenPair (tested indirectly)
  // ─────────────────────────────────────────────
  describe('generateTokenPair (indirect)', () => {
    it('should call jwtService.signAsync with correct payload and config values', async () => {
      const user = mockUser();

      mockPrisma.user.findFirst.mockResolvedValue(user);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('test-access')
        .mockResolvedValueOnce('test-refresh');
      mockPrisma.activityLog.create.mockResolvedValue(undefined);

      await service.login({ email: user.email, password: 'pass' } as LoginDto);

      expect(mockConfigService.get).toHaveBeenCalledWith('jwt.accessSecret', 'access-secret');
      expect(mockConfigService.get).toHaveBeenCalledWith('jwt.refreshSecret', 'refresh-secret');
      expect(mockConfigService.get).toHaveBeenCalledWith('jwt.accessExpiry', '15m');
      expect(mockConfigService.get).toHaveBeenCalledWith('jwt.refreshExpiry', '7d');
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        { sub: user.id, email: user.email, roleId: user.roleId },
        { secret: 'test-access-secret', expiresIn: '15m' },
      );
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        { sub: user.id, email: user.email, roleId: user.roleId },
        { secret: 'test-refresh-secret', expiresIn: '7d' },
      );
    });
  });
});

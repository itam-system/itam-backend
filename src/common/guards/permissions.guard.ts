import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { PrismaService } from '../database/prisma.service.js';
import { BusinessException } from '../exceptions/business.exception.js';
import { ErrorCodes } from '../constants/error-codes.constant.js';
import type { ActiveUser } from '../interfaces/active-user.interface.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Permissions() decorator — allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: ActiveUser = request.user;

    if (!user) {
      throw new BusinessException(
        ErrorCodes.FORBIDDEN,
        'Authentication required',
        HttpStatus.FORBIDDEN,
      );
    }

    // Fetch role with permission IDs
    const role = await this.prisma.role.findUnique({
      where: { id: user.roleId },
    });

    if (!role) {
      throw new BusinessException(
        ErrorCodes.ROLE_NOT_FOUND,
        'User role not found',
        HttpStatus.FORBIDDEN,
      );
    }

    // Fetch permission slugs
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: role.permissionIds },
        isDeleted: false,
      },
      select: { slug: true },
    });

    const userPermissionSlugs = permissions.map((p) => p.slug);

    // Check if user has ALL required permissions
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissionSlugs.includes(perm),
    );

    if (!hasAllPermissions) {
      throw new BusinessException(
        ErrorCodes.FORBIDDEN,
        'You do not have permission to perform this action',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}

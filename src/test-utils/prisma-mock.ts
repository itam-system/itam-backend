import type { Asset, User, Assignment, Role, Permission, Category, RefreshToken, ActivityLog } from '@prisma/client';

export interface MockTx {
  assignment: {
    create: jest.Mock;
    update: jest.Mock;
  };
  asset: {
    update: jest.Mock;
  };
}

export interface MockPrisma {
  user: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
  };
  asset: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  assignment: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  refreshToken: {
    create: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  activityLog: {
    create: jest.Mock;
  };
  role: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
  permission: {
    findMany: jest.Mock;
  };
  category: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
  $transaction: jest.Mock;
  $runCommandRaw: jest.Mock;
}

export function createMockPrisma(): { mockPrisma: MockPrisma; mockTx: MockTx } {
  const mockTx: MockTx = {
    assignment: { create: jest.fn(), update: jest.fn() },
    asset: { update: jest.fn() },
  };

  const mockPrisma: MockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    asset: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    assignment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    activityLog: { create: jest.fn() },
    role: { findUnique: jest.fn(), findMany: jest.fn() },
    permission: { findMany: jest.fn() },
    category: { findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((cb: (tx: MockTx) => unknown) => cb(mockTx)),
    $runCommandRaw: jest.fn(),
  };

  return { mockPrisma, mockTx };
}

export function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    employeeId: 'EMP-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: '$2a$10$hashedpassword',
    phone: '+1234567890',
    department: 'Engineering',
    position: 'Developer',
    avatar: null,
    roleId: 'role-1',
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

export function mockAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    assetCode: 'AST-000001',
    name: 'MacBook Pro',
    brand: 'Apple',
    model: 'M3 Pro',
    serialNumber: 'SN-001',
    categoryId: 'cat-1',
    status: 'AVAILABLE' as const,
    assignedTo: null,
    purchaseDate: null,
    purchasePrice: null,
    warrantyExpiry: null,
    location: 'Main Office',
    department: 'Engineering',
    description: null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    updatedBy: null,
    ...overrides,
  } as Asset;
}

export function mockAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'assign-1',
    assetId: 'asset-1',
    assignedTo: 'user-2',
    assignedBy: 'user-1',
    transferredFrom: null,
    action: 'ASSIGN' as const,
    notes: null,
    assignedAt: new Date(),
    returnedAt: null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    ...overrides,
  } as Assignment;
}

export function mockRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-1',
    name: 'Admin',
    description: 'Administrator',
    permissionIds: ['perm-1', 'perm-2'],
    isSystem: false,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Role;
}

export function mockPermission(overrides: Partial<Permission> = {}): Permission {
  return {
    id: 'perm-1',
    slug: 'users.create',
    description: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Permission;
}

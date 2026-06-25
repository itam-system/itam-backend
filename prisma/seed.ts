import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// Permission definitions
// ─────────────────────────────────────────────────────────────
const PERMISSIONS = [
  // Dashboard
  { module: 'dashboard', action: 'view', slug: 'dashboard.view', description: 'View dashboard KPIs' },

  // Users
  { module: 'users', action: 'view', slug: 'users.view', description: 'View users list and details' },
  { module: 'users', action: 'create', slug: 'users.create', description: 'Create new users' },
  { module: 'users', action: 'edit', slug: 'users.edit', description: 'Edit existing users' },
  { module: 'users', action: 'delete', slug: 'users.delete', description: 'Soft delete users' },

  // Roles
  { module: 'roles', action: 'view', slug: 'roles.view', description: 'View roles list and details' },
  { module: 'roles', action: 'create', slug: 'roles.create', description: 'Create new roles' },
  { module: 'roles', action: 'edit', slug: 'roles.edit', description: 'Edit existing roles' },
  { module: 'roles', action: 'delete', slug: 'roles.delete', description: 'Soft delete roles' },

  // Permissions
  { module: 'permissions', action: 'view', slug: 'permissions.view', description: 'View permissions' },
  { module: 'permissions', action: 'create', slug: 'permissions.create', description: 'Create permissions' },
  { module: 'permissions', action: 'edit', slug: 'permissions.edit', description: 'Edit permissions' },
  { module: 'permissions', action: 'delete', slug: 'permissions.delete', description: 'Delete permissions' },

  // Assets
  { module: 'assets', action: 'view', slug: 'assets.view', description: 'View assets list and details' },
  { module: 'assets', action: 'create', slug: 'assets.create', description: 'Create new assets' },
  { module: 'assets', action: 'edit', slug: 'assets.edit', description: 'Edit existing assets' },
  { module: 'assets', action: 'delete', slug: 'assets.delete', description: 'Soft delete assets' },
  { module: 'assets', action: 'assign', slug: 'assets.assign', description: 'Assign/return/transfer assets' },

  // Categories
  { module: 'categories', action: 'view', slug: 'categories.view', description: 'View categories' },
  { module: 'categories', action: 'create', slug: 'categories.create', description: 'Create categories' },
  { module: 'categories', action: 'edit', slug: 'categories.edit', description: 'Edit categories' },
  { module: 'categories', action: 'delete', slug: 'categories.delete', description: 'Delete categories' },

  // Assignments
  { module: 'assignments', action: 'view', slug: 'assignments.view', description: 'View assignment history' },

  // Reports
  { module: 'reports', action: 'view', slug: 'reports.view', description: 'View reports' },
  { module: 'reports', action: 'export', slug: 'reports.export', description: 'Export reports (CSV/Excel)' },

  // Activity Logs
  { module: 'activity-logs', action: 'view', slug: 'activity-logs.view', description: 'View activity logs' },

  // Settings
  { module: 'settings', action: 'view', slug: 'settings.view', description: 'View system settings' },
  { module: 'settings', action: 'edit', slug: 'settings.edit', description: 'Edit system settings' },
];

// ─────────────────────────────────────────────────────────────
// Default Settings
// ─────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = [
  { key: 'company_name', value: 'ITAM System', group: 'general', description: 'Company display name' },
  { key: 'timezone', value: 'Asia/Phnom_Penh', group: 'general', description: 'System timezone' },
  { key: 'date_format', value: 'DD/MM/YYYY', group: 'general', description: 'Display date format' },
  { key: 'currency', value: 'USD', group: 'general', description: 'Currency for asset values' },
  { key: 'pagination_limit', value: '20', group: 'general', description: 'Default items per page' },
  { key: 'asset_code_length', value: '6', group: 'asset', description: 'Auto-generated asset code length' },
];

// ─────────────────────────────────────────────────────────────
// Normal User permissions (read-only access)
// ─────────────────────────────────────────────────────────────
const NORMAL_USER_PERMISSION_SLUGS = [
  'dashboard.view',
  'assets.view',
  'categories.view',
  'assignments.view',
];

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ── 1. Seed Permissions ────────────────────────────────────
  console.log(`📋 Seeding ${PERMISSIONS.length} permissions...`);
  const createdPermissions: Array<{ id: string; slug: string }> = [];

  for (const perm of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: {},
      create: perm,
    });
    createdPermissions.push({ id: permission.id, slug: permission.slug });
  }
  console.log(`  ✅ ${createdPermissions.length} permissions seeded\n`);

  // ── 2. Seed Roles ──────────────────────────────────────────
  const allPermissionIds = createdPermissions.map((p) => p.id);
  const normalUserPermissionIds = createdPermissions
    .filter((p) => NORMAL_USER_PERMISSION_SLUGS.includes(p.slug))
    .map((p) => p.id);

  console.log('👥 Seeding system roles...');

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: { permissionIds: allPermissionIds },
    create: {
      name: 'Admin',
      description: 'Full system access — all permissions',
      permissionIds: allPermissionIds,
      isSystem: true,
    },
  });
  console.log(`  ✅ Role: Admin (id: ${adminRole.id})`);

  const userRole = await prisma.role.upsert({
    where: { name: 'User' },
    update: { permissionIds: normalUserPermissionIds },
    create: {
      name: 'User',
      description: 'Read-only access to dashboard, assets, categories, and assignments',
      permissionIds: normalUserPermissionIds,
      isSystem: true,
    },
  });
  console.log(`  ✅ Role: User (id: ${userRole.id})\n`);

  // ── 3. Seed Default Admin User ─────────────────────────────
  console.log('👤 Seeding default admin user...');
  const defaultPassword = 'Admin@1234';
  const hashedPassword = await hash(defaultPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@itam.local' },
    update: {},
    create: {
      employeeId: 'ADMIN-001',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@itam.local',
      password: hashedPassword,
      roleId: adminRole.id,
      isActive: true,
    },
  });
  console.log(`  ✅ Admin user: ${adminUser.email} (id: ${adminUser.id})`);
  console.log(`  ⚠️  Default password: ${defaultPassword} — CHANGE THIS IN PRODUCTION!\n`);

  // ── 4. Seed Default Settings ───────────────────────────────
  console.log(`⚙️  Seeding ${DEFAULT_SETTINGS.length} default settings...`);
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`  ✅ ${DEFAULT_SETTINGS.length} settings seeded\n`);

  console.log('✅ Database seed completed successfully!');
  console.log('\n─────────────────────────────────────────');
  console.log('📊 Seed Summary:');
  console.log(`  Permissions : ${PERMISSIONS.length}`);
  console.log(`  Roles       : 2 (Admin, User)`);
  console.log(`  Admin User  : admin@itam.local`);
  console.log(`  Settings    : ${DEFAULT_SETTINGS.length}`);
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

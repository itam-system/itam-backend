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
  // Company Profile (group: "company")
  { key: 'company_name', value: 'ITAM System', group: 'company', description: 'Company display name' },
  { key: 'company_logo', value: '', group: 'company', description: 'Company logo (base64 data URL)' },
  { key: 'company_email', value: '', group: 'company', description: 'Company email address' },
  { key: 'company_phone', value: '', group: 'company', description: 'Company phone number' },
  { key: 'company_website', value: '', group: 'company', description: 'Company website' },
  { key: 'company_address', value: '{}', group: 'company', description: 'Company address (JSON)' },
  { key: 'company_country', value: 'Cambodia', group: 'company', description: 'Country' },
  { key: 'timezone', value: 'Asia/Phnom_Penh', group: 'company', description: 'System timezone' },
  { key: 'currency', value: 'USD', group: 'company', description: 'Currency for asset values' },
  { key: 'date_format', value: 'DD/MM/YYYY', group: 'company', description: 'Date display format' },
  { key: 'time_format', value: 'HH:mm', group: 'company', description: 'Time display format' },

  // Security (group: "security")
  { key: 'access_token_lifetime', value: '15', group: 'security', description: 'Access token lifetime (minutes)' },
  { key: 'refresh_token_lifetime', value: '7', group: 'security', description: 'Refresh token lifetime (days)' },
  { key: 'min_password_length', value: '8', group: 'security', description: 'Minimum password length' },
  { key: 'require_uppercase', value: 'true', group: 'security', description: 'Require uppercase in password' },
  { key: 'require_numbers', value: 'true', group: 'security', description: 'Require numbers in password' },
  { key: 'require_special_chars', value: 'false', group: 'security', description: 'Require special characters in password' },
  { key: 'max_login_attempts', value: '5', group: 'security', description: 'Maximum failed login attempts' },
  { key: 'account_lock_duration', value: '15', group: 'security', description: 'Account lock duration (minutes)' },
  { key: 'session_timeout', value: '30', group: 'security', description: 'Session timeout (minutes)' },

  // Asset Settings (group: "asset")
  { key: 'asset_code_prefix', value: 'AST', group: 'asset', description: 'Auto-generated asset code prefix' },
  { key: 'auto_generate_asset_code', value: 'true', group: 'asset', description: 'Auto-generate asset codes' },
  { key: 'next_asset_number', value: '1', group: 'asset', description: 'Next asset sequence number' },
  { key: 'asset_code_length', value: '3', group: 'asset', description: 'Zero-padded asset code length' },
  { key: 'warranty_reminder_days', value: '30', group: 'asset', description: 'Days before warranty expiry to alert' },
  { key: 'pagination_limit', value: '20', group: 'asset', description: 'Default items per page' },

  // Assignment Settings (group: "assignment")
  { key: 'default_assignment_duration', value: '365', group: 'assignment', description: 'Default assignment duration (days)' },
  { key: 'require_expected_return_date', value: 'false', group: 'assignment', description: 'Require expected return date on assign' },
  { key: 'require_return_condition', value: 'true', group: 'assignment', description: 'Require condition report on return' },
  { key: 'enable_overdue_alerts', value: 'true', group: 'assignment', description: 'Enable overdue assignment alerts' },

  // Notification Settings (group: "notification")
  { key: 'notify_warranty_expiry', value: 'true', group: 'notification', description: 'Alert on warranty expiry' },
  { key: 'notify_overdue_assignment', value: 'true', group: 'notification', description: 'Alert on overdue assignments' },
  { key: 'notify_new_user', value: 'false', group: 'notification', description: 'Alert when new user is created' },
  { key: 'notify_asset_assigned', value: 'true', group: 'notification', description: 'Alert when asset is assigned' },
  { key: 'notify_asset_returned', value: 'true', group: 'notification', description: 'Alert when asset is returned' },
  { key: 'notify_password_changed', value: 'true', group: 'notification', description: 'Alert on password change' },

  // Appearance (group: "appearance")
  { key: 'system_theme', value: 'light', group: 'appearance', description: 'System theme (light/dark)' },
  { key: 'language', value: 'en', group: 'appearance', description: 'UI language' },
  { key: 'display_date_format', value: 'DD/MM/YYYY', group: 'appearance', description: 'UI date display format' },
  { key: 'display_time_format', value: 'HH:mm', group: 'appearance', description: 'UI time display format' },
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

// ─────────────────────────────────────────────────────────────
// Role permission definitions matching frontend conventions
// ─────────────────────────────────────────────────────────────
const VIEWER_PERMISSION_SLUGS = [
  'dashboard.view',
  'users.view',
  'roles.view',
  'permissions.view',
  'assets.view',
  'categories.view',
  'assignments.view',
  'activity-logs.view',
  'reports.view',
  'settings.view',
];

const EDITOR_EXCLUDED_SLUGS = new Set([
  'users.delete',
  'roles.delete',
  'permissions.create',
  'permissions.edit',
  'permissions.delete',
  'assets.delete',
  'categories.delete',
  'settings.edit',
]);

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
  console.log(`  ✅ Role: User (id: ${userRole.id})`);

  // Role: EDITOR — full access except destructive operations
  const editorPermissionIds = createdPermissions
    .filter((p) => !EDITOR_EXCLUDED_SLUGS.has(p.slug))
    .map((p) => p.id);

  const editorRole = await prisma.role.upsert({
    where: { name: 'EDITOR' },
    update: { permissionIds: editorPermissionIds },
    create: {
      name: 'EDITOR',
      description: 'Edit access — create and edit records, no deletions',
      permissionIds: editorPermissionIds,
      isSystem: true,
    },
  });
  console.log(`  ✅ Role: EDITOR (id: ${editorRole.id})`);

  // Role: VIEWER — read-only access
  const viewerPermissionIds = createdPermissions
    .filter((p) => VIEWER_PERMISSION_SLUGS.includes(p.slug))
    .map((p) => p.id);

  const viewerRole = await prisma.role.upsert({
    where: { name: 'VIEWER' },
    update: { permissionIds: viewerPermissionIds },
    create: {
      name: 'VIEWER',
      description: 'Read-only access across all modules',
      permissionIds: viewerPermissionIds,
      isSystem: true,
    },
  });
  console.log(`  ✅ Role: VIEWER (id: ${viewerRole.id})\n`);

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
  console.log(`  ⚠️  Default password: ${defaultPassword} — CHANGE THIS IN PRODUCTION!`);

  // ── 3b. Seed Editor User ─────────────────────────────────
  const editorHashedPassword = await hash('Editor@1234', 12);
  const editorUser = await prisma.user.upsert({
    where: { email: 'editor@itam.local' },
    update: {},
    create: {
      employeeId: 'EDITOR-001',
      firstName: 'Editor',
      lastName: 'User',
      email: 'editor@itam.local',
      password: editorHashedPassword,
      roleId: editorRole.id,
      department: 'IT Department',
      position: 'IT Staff',
      isActive: true,
    },
  });
  console.log(`  ✅ Editor user: ${editorUser.email} (id: ${editorUser.id})`);

  // ── 3c. Seed Viewer User ────────────────────────────────
  const viewerHashedPassword = await hash('Viewer@1234', 12);
  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@itam.local' },
    update: {},
    create: {
      employeeId: 'VIEWER-001',
      firstName: 'Viewer',
      lastName: 'User',
      email: 'viewer@itam.local',
      password: viewerHashedPassword,
      roleId: viewerRole.id,
      department: 'Design',
      position: 'UI/UX Designer',
      isActive: true,
    },
  });
  console.log(`  ✅ Viewer user: ${viewerUser.email} (id: ${viewerUser.id})\n`);

  // ── 4. Seed Default Categories ─────────────────────────────
  console.log('📦 Seeding default categories...');

  const defaultCategories = [
    { name: 'IT Equipment', code: 'IT-EQP', slug: 'it-equipment', description: 'Computers, laptops, servers, and peripherals', icon: 'monitor', color: '#6366f1' },
    { name: 'Furniture', code: 'FRN', slug: 'furniture', description: 'Desks, chairs, cabinets, and office furniture', icon: 'armchair', color: '#f59e0b' },
    { name: 'Software', code: 'SW', slug: 'software', description: 'Licensed software, subscriptions, and digital assets', icon: 'package', color: '#10b981' },
    { name: 'Vehicles', code: 'VEH', slug: 'vehicles', description: 'Company vehicles and transportation equipment', icon: 'car', color: '#ef4444' },
    { name: 'Office Supplies', code: 'OFF-SUP', slug: 'office-supplies', description: 'Consumable office materials and stationery', icon: 'book-open', color: '#8b5cf6' },
    { name: 'Other', code: 'OTHER', slug: 'other', description: 'Miscellaneous assets not fitting other categories', icon: 'folder', color: '#6b7280' },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log(`  ✅ ${defaultCategories.length} categories seeded\n`);

  // ── 5. Seed Default Settings ───────────────────────────────
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
  console.log(`  Categories  : 6 (IT Equipment, Furniture, Software, Vehicles, Office Supplies, Other)`);
  console.log(`  Roles       : 3 (ADMIN, EDITOR, VIEWER) + existing (Admin, User)`);
  console.log(`  Users       :`);
  console.log(`    admin@itam.local  / Admin@1234  → ADMIN`);
  console.log(`    editor@itam.local / Editor@1234 → EDITOR`);
  console.log(`    viewer@itam.local / Viewer@1234 → VIEWER`);
  console.log(`  Settings    : ${DEFAULT_SETTINGS.length} (${DEFAULT_SETTINGS.filter(s => s.group === 'company').length} company, ${DEFAULT_SETTINGS.filter(s => s.group === 'security').length} security, ${DEFAULT_SETTINGS.filter(s => s.group === 'asset').length} asset, ${DEFAULT_SETTINGS.filter(s => s.group === 'assignment').length} assignment, ${DEFAULT_SETTINGS.filter(s => s.group === 'notification').length} notification, ${DEFAULT_SETTINGS.filter(s => s.group === 'appearance').length} appearance)`);
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

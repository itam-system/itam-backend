import { Injectable } from '@nestjs/common';
import { SettingsRepository } from './settings.repository.js';
import type { Setting } from '@prisma/client';

const BOOLEAN_KEYS = new Set([
  'require_uppercase',
  'require_numbers',
  'require_special_chars',
  'auto_generate_asset_code',
  'allow_duplicate_model',
  'require_expected_return_date',
  'require_return_condition',
  'enable_overdue_alerts',
  'notify_warranty_expiry',
  'notify_overdue_assignment',
  'notify_new_user',
  'notify_asset_assigned',
  'notify_asset_returned',
  'notify_password_changed',
]);

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async getAll(group?: string): Promise<Setting[]> {
    return this.settingsRepository.findAll(group);
  }

  async updateMany(entries: { key: string; value: string }[]): Promise<Setting[]> {
    return this.settingsRepository.upsertMany(entries);
  }

  async getSystemInfo(): Promise<{
    applicationVersion: string;
    apiVersion: string;
    nodeVersion: string;
    environment: string;
    databaseVersion: string;
  }> {
    const { version: nodeVersion } = process;
    const dbVersion = await this.getDatabaseVersion();

    return {
      applicationVersion: process.env.npm_package_version ?? '1.0.0',
      apiVersion: 'v1',
      nodeVersion: nodeVersion ?? 'unknown',
      environment: process.env.NODE_ENV ?? 'development',
      databaseVersion: dbVersion,
    };
  }

  async exportConfig(): Promise<{ key: string; value: string }[]> {
    const settings = await this.settingsRepository.findAll();
    return settings.map((s) => ({ key: s.key, value: s.value }));
  }

  async importConfig(entries: { key: string; value: string }[]): Promise<Setting[]> {
    return this.settingsRepository.upsertMany(entries);
  }

  async clearCache(): Promise<void> {
    // Placeholder for future in-memory cache invalidation
    // In a production system, this would clear a Redis cache or in-memory Map
    return;
  }

  private async getDatabaseVersion(): Promise<string> {
    try {
      const prisma = (this.settingsRepository as any).prisma;
      if (prisma?.$queryRaw) {
        const result = await prisma.$queryRaw`db.version()` as any;
        return result?.[0]?.version ?? 'unknown';
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  coerceValue(key: string, rawValue: string): string | number | boolean {
    if (BOOLEAN_KEYS.has(key)) {
      return rawValue === 'true';
    }
    if (
      key.endsWith('_length') ||
      key.endsWith('_lifetime') ||
      key.endsWith('_duration') ||
      key.endsWith('_attempts') ||
      key.endsWith('_limit') ||
      key.endsWith('_number') ||
      key.endsWith('_days') ||
      key.endsWith('_timeout')
    ) {
      const num = Number(rawValue);
      return Number.isNaN(num) ? rawValue : num;
    }
    return rawValue;
  }
}

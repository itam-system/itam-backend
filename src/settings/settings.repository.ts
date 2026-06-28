import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Setting } from '@prisma/client';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(group?: string): Promise<Setting[]> {
    const where = group ? { group } : {};
    return this.prisma.setting.findMany({
      where,
      orderBy: { key: 'asc' },
    });
  }

  async findByKey(key: string): Promise<Setting | null> {
    return this.prisma.setting.findUnique({ where: { key } });
  }

  async upsert(key: string, value: string): Promise<Setting> {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async upsertMany(entries: { key: string; value: string }[]): Promise<Setting[]> {
    const operations = entries.map((entry) =>
      this.prisma.setting.upsert({
        where: { key: entry.key },
        update: { value: entry.value },
        create: { key: entry.key, value: entry.value },
      }),
    );
    return this.prisma.$transaction(operations);
  }

  async count(): Promise<number> {
    return this.prisma.setting.count();
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import {
  UpdateSettingsDto,
  ImportSettingsDto,
  SettingResponseDto,
  SettingsListResponseDto,
  SystemInfoResponseDto,
} from './dto/index.js';

@ApiTags('Settings')
@ApiBearerAuth('JWT-Auth')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions('settings.view')
  @ApiOperation({ summary: 'Get all settings' })
  @ApiQuery({ name: 'group', required: false, type: String, description: 'Filter by group (company, security, asset, assignment, notification, appearance)' })
  @ApiOkResponse({ type: SettingsListResponseDto })
  async findAll(@Query('group') group?: string) {
    const settings = await this.settingsService.getAll(group);
    return { data: settings, total: settings.length };
  }

  @Patch()
  @Permissions('settings.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update settings' })
  @ApiBody({ type: UpdateSettingsDto })
  @ApiOkResponse({ type: SettingsListResponseDto })
  async update(@Body() dto: UpdateSettingsDto) {
    const settings = await this.settingsService.updateMany(dto.settings);
    return { data: settings, total: settings.length };
  }

  @Get('system-info')
  @Permissions('settings.view')
  @ApiOperation({ summary: 'Get read-only system information' })
  @ApiOkResponse({ type: SystemInfoResponseDto })
  async getSystemInfo() {
    return this.settingsService.getSystemInfo();
  }

  @Post('export')
  @Permissions('settings.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export all settings as JSON' })
  async exportConfig() {
    const config = await this.settingsService.exportConfig();
    return { data: config };
  }

  @Post('import')
  @Permissions('settings.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import settings from JSON payload' })
  @ApiBody({ type: ImportSettingsDto })
  async importConfig(@Body() dto: ImportSettingsDto) {
    const settings = await this.settingsService.importConfig(dto.settings);
    return { data: settings, total: settings.length };
  }

  @Post('clear-cache')
  @Permissions('settings.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear settings cache' })
  async clearCache() {
    await this.settingsService.clearCache();
    return { message: 'Cache cleared successfully' };
  }
}

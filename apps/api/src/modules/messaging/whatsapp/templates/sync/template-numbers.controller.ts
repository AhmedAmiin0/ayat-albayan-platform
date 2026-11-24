import type { TemplateNumberSyncView } from '@ab/shared';
import { Controller, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { TemplateManagerGuard } from '@/modules/messaging/whatsapp/templates/catalog/template-manager.guard';
import { TemplateNumbers } from './template-numbers.service';

/** docs/23c decision 9: needs templates.manage, never a sales, assistant or teacher based role. */
@ApiTags('messaging')
@ApiBearerAuth()
@Permissions('templates.manage')
@Controller('admin/numbers')
export class TemplateNumbersController {
  constructor(private readonly templates: TemplateNumbers) {}

  @Post(':id/templates/sync')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  sync(@Param('id', new ParseUUIDPipe()) id: string): Promise<TemplateNumberSyncView> {
    return this.templates.sync(id);
  }
}

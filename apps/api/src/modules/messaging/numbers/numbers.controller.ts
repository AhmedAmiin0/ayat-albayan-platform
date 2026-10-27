import {
  numberCreateSchema, numberSecretNameSchema, numberSecretSchema, numbersImportSchema, numberUpdateSchema,
  type ImportResult, type NumberView, type OwnTrafficView,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { NumbersImport } from './import/numbers.import';
import { NumbersService } from './numbers.service';
import { OwnNumbers } from './own/own-numbers';

/** :id is a uuid, :name one of the two secret names (anything else is 400). */
const SECRET_PARAMS = z.object({ id: z.uuid(), name: numberSecretNameSchema });

/**
 * «الأرقام» (docs/23 §3 phase 3): WhatsApp numbers as records. Reading needs settings.read; every write
 * numbers.manage (RLS: admins read, the service role writes). Secrets are write-only: no route returns
 * a value. Nothing here sends a message or touches a sending switch.
 */
@ApiTags('numbers')
@ApiBearerAuth()
@Controller('admin/numbers')
export class NumbersController {
  constructor(
    private readonly numbers: NumbersService,
    private readonly importer: NumbersImport,
    private readonly own: OwnNumbers,
  ) {}

  @Get()
  @Permissions('settings.read')
  list(): Promise<NumberView[]> {
    return this.numbers.list();
  }

  /** «رسائل بين أرقام الأكاديمية»: how many inbound rows came from our own numbers in the last 7 days. */
  @Get('own-traffic')
  @Permissions('settings.read')
  async ownTraffic(): Promise<OwnTrafficView> {
    return { inbound_7d: await this.own.weekInbound() };
  }

  @Post()
  @HttpCode(201)
  @Permissions('numbers.manage')
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<NumberView> {
    return this.numbers.create(parseOrThrow(numberCreateSchema, body), user.id);
  }

  /** Dry run: per role, today's values and their source, never a secret. Apply: idempotent. */
  @Post('import')
  @HttpCode(200)
  @Permissions('numbers.manage')
  import(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ImportResult> {
    return this.importer.run(parseOrThrow(numbersImportSchema, body).dryRun, user.id);
  }

  @Patch(':id')
  @Permissions('numbers.manage')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<NumberView> {
    return this.numbers.update(id, parseOrThrow(numberUpdateSchema, body), user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @Permissions('numbers.manage')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.numbers.remove(id, user.id);
  }

  @Put(':id/secrets/:name')
  @Permissions('numbers.manage')
  setSecret(@Param() params: unknown, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<NumberView> {
    const target = { ...parseOrThrow(SECRET_PARAMS, params), value: parseOrThrow(numberSecretSchema, body).value };
    return this.numbers.setSecret(target, user.id);
  }

  @Delete(':id/secrets/:name')
  @Permissions('numbers.manage')
  clearSecret(@Param() params: unknown, @CurrentUser() user: AuthUser): Promise<NumberView> {
    return this.numbers.clearSecret(parseOrThrow(SECRET_PARAMS, params), user.id);
  }
}

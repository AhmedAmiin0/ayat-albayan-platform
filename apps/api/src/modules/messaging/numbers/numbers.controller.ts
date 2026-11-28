import {
  numberCreateSchema,
  numberSecretNameSchema,
  numberSecretSchema,
  numbersImportSchema,
  numberUpdateSchema,
  type ImportResult,
  type NumberCreate,
  type NumberUpdate,
  type NumberView,
  type OwnTrafficView,
} from '@ab/shared';
import { id } from '@ab/core';
import { Controller, Delete, Get, HttpCode, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodBody, ZodParam, ZodParams } from '@/common/http/zod-inputs';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { NumbersImport } from './import/numbers.import';
import { NumbersService } from './numbers.service';
import { OwnNumbers } from './own/own-numbers';

/** :id is a uuid, :name one of the two secret names (anything else is 400). */
const SECRET_PARAMS = z.object({ id: z.uuid(), name: numberSecretNameSchema });
type SecretParams = z.output<typeof SECRET_PARAMS>;

/** docs/23 §3: reads need settings.read, writes numbers.manage; secrets are write-only. */
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

  /** Inbound rows from our own numbers in the last 7 days. */
  @Get('own-traffic')
  @Permissions('settings.read')
  async ownTraffic(): Promise<OwnTrafficView> {
    return { inbound_7d: await this.own.weekInbound() };
  }

  @Post()
  @HttpCode(201)
  @Permissions('numbers.manage')
  create(
    @ZodBody(numberCreateSchema) body: NumberCreate,
    @CurrentUser() user: AuthUser,
  ): Promise<NumberView> {
    return this.numbers.create(body, user.id);
  }

  /** Dry run: per role, today's values and their source, never a secret. Apply: idempotent. */
  @Post('import')
  @HttpCode(200)
  @Permissions('numbers.manage')
  import(
    @ZodBody(numbersImportSchema) body: z.output<typeof numbersImportSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<ImportResult> {
    return this.importer.run(body.dryRun, user.id);
  }

  @Patch(':id')
  @Permissions('numbers.manage')
  update(
    @ZodParam('id', id()) numberId: string,
    @ZodBody(numberUpdateSchema) body: NumberUpdate,
    @CurrentUser() user: AuthUser,
  ): Promise<NumberView> {
    return this.numbers.update(numberId, body, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @Permissions('numbers.manage')
  remove(
    @ZodParam('id', id()) numberId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.numbers.remove(numberId, user.id);
  }

  @Put(':id/secrets/:name')
  @Permissions('numbers.manage')
  setSecret(
    @ZodParams(SECRET_PARAMS) params: SecretParams,
    @ZodBody(numberSecretSchema) body: z.output<typeof numberSecretSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<NumberView> {
    return this.numbers.setSecret({ ...params, value: body.value }, user.id);
  }

  @Delete(':id/secrets/:name')
  @Permissions('numbers.manage')
  clearSecret(
    @ZodParams(SECRET_PARAMS) params: SecretParams,
    @CurrentUser() user: AuthUser,
  ): Promise<NumberView> {
    return this.numbers.clearSecret(params, user.id);
  }
}

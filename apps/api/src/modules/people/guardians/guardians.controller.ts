import { guardianCreateSchema, guardianUpdateSchema, phoneE164 } from '@ab/shared';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { GuardianPhonesService } from './guardian-phones.service';
import { GuardiansService } from './guardians.service';
import { parseOrThrow } from '@/common/http/http';
import { ZodBody, ZodQuery } from '@/common/http/zod-inputs';
import { blanksToNull, listQuerySchema, type ListQuery } from './http';

const createBody = blanksToNull(guardianCreateSchema);
const updateBody = blanksToNull(guardianUpdateSchema);

/** Admin-only guardians CRUD (R-STU-02, R-STU-04). */
@ApiTags('guardians')
@ApiBearerAuth()
@Permissions('guardians.write')
@Controller('guardians')
export class GuardiansController {
  constructor(
    private readonly guardians: GuardiansService,
    private readonly phones: GuardianPhonesService,
  ) {}

  @Get()
  @Permissions('guardians.read')
  list(@ZodQuery(listQuerySchema) query: ListQuery) {
    return this.guardians.list(query);
  }

  @Get(':id')
  @Permissions('guardians.read')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.guardians.get(id);
  }

  @Post()
  create(@ZodBody(createBody) body: z.output<typeof createBody>, @CurrentUser() user: AuthUser) {
    return this.guardians.create(body, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(updateBody) body: z.output<typeof updateBody>,
  ) {
    return this.guardians.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.guardians.remove(id);
  }

  /** The family's second number (owner 2026-10-29), `phone` URL-encoded (%2B…); 404 phone_not_found. */
  @Delete(':id/phones/:phone')
  @HttpCode(204)
  removePhone(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phone') phone: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.phones.removeSecond({
      guardianId: id,
      phone: parseOrThrow(phoneE164, phone),
      actorId: user.id,
    });
  }
}

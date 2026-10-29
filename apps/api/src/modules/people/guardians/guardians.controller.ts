import { guardianCreateSchema, guardianUpdateSchema, phoneE164 } from '@ab/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { GuardianPhonesService } from './guardian-phones.service';
import { GuardiansService } from './guardians.service';
import { blankToNull, listQuerySchema, parse } from './http';

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
  list(@Query() query: unknown) {
    return this.guardians.list(parse(listQuerySchema, query));
  }

  @Get(':id')
  @Permissions('guardians.read')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.guardians.get(id);
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.guardians.create(parse(guardianCreateSchema, blankToNull(body)), user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.guardians.update(id, parse(guardianUpdateSchema, blankToNull(body)));
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.guardians.remove(id);
  }

  /** The family's second number (owner 2026-10-29), `phone` URL-encoded (%2B…); 404 phone_not_found. */
  @Delete(':id/phones/:phone')
  @HttpCode(204)
  removePhone(@Param('id', ParseUUIDPipe) id: string, @Param('phone') phone: string, @CurrentUser() user: AuthUser) {
    return this.phones.removeSecond({ guardianId: id, phone: parse(phoneE164, phone), actorId: user.id });
  }
}

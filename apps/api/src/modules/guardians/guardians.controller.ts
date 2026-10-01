import { guardianCreateSchema, guardianUpdateSchema } from '@ab/shared';
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
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { GuardiansService } from './guardians.service';
import { blankToNull, listQuerySchema, parse } from './http';

/** Admin-only guardians CRUD (R-STU-02, R-STU-04). */
@ApiTags('guardians')
@ApiBearerAuth()
@Roles('admin')
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardians: GuardiansService) {}

  @Get()
  list(@Query() query: unknown) {
    return this.guardians.list(parse(listQuerySchema, query));
  }

  @Get(':id')
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
}

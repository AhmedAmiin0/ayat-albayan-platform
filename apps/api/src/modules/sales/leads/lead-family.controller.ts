import { leadFamilyLinkSchema, type LeadFamilyLinked } from '@ab/shared';
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { LeadFamilyService } from './lead-family.service';
import { isAdmin } from '@/common/auth/roles';

/** leads.link_family; body is a generated code; answers never an id or a phone. */
@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadFamilyController {
  constructor(private readonly family: LeadFamilyService) {}

  @Post(':id/link-family')
  @HttpCode(200)
  @Permissions('leads.link_family')
  link(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<LeadFamilyLinked> {
    const { code } = parseOrThrow(leadFamilyLinkSchema, body);
    return this.family.link({ leadId: id, code, actorId: user.id, admin: isAdmin(user) });
  }
}

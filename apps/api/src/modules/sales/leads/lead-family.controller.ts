import { leadFamilyLinkSchema, type LeadFamilyLinked } from '@ab/shared';
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOr400 } from './http';
import { LeadFamilyService } from './lead-family.service';

/**
 * «ربط بطالب موجود» (owner 2026-10-29): a lead chat's number becomes the second number of an existing student's
 * family. Its own key, leads.link_family (the admin's by default; grantable from the matrix). Body { code }
 * (a generated AB-nnnn code, from GET /sales/registration-check); 200 { linked }, never an id or a phone.
 */
@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadFamilyController {
  constructor(private readonly family: LeadFamilyService) {}

  @Post(':id/link-family')
  @HttpCode(200)
  @Permissions('leads.link_family')
  link(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<LeadFamilyLinked> {
    const { code } = parseOr400(leadFamilyLinkSchema, body);
    return this.family.link({ leadId: id, code, actorId: user.id });
  }
}

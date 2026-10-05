import { leadAssignSchema, type SalesPersonView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { SalesAssignService } from './sales-assign.service';

/** The admin's side of the sales portal: who owns which lead. */
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('leads.assign')
@Controller()
export class SalesAdminController {
  constructor(private readonly assigns: SalesAssignService) {}

  /** 400 not_a_salesperson, 404 lead_not_found. */
  @Post('leads/:id/assign')
  @HttpCode(200)
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { profileId } = parseOrThrow(leadAssignSchema, body);
    return this.assigns.assign({ leadId: id, profileId, actorId: user.id });
  }

  @Post('leads/assign-unassigned')
  @HttpCode(200)
  assignUnassigned(): Promise<{ assigned: number }> {
    return this.assigns.assignUnassigned();
  }

  @Get('sales/people')
  people(): Promise<SalesPersonView[]> {
    return this.assigns.list();
  }
}

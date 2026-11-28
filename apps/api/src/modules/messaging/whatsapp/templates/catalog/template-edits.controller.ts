import {
  templateEditRoutes as routes,
  type TemplateMoveView, type TemplateNumberSetView, type TemplateView,
} from '@ab/shared';
import { Controller, HttpCode, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { TemplateEditor } from '@/modules/messaging/whatsapp/templates/edit/template-editor';
import { TemplateNumbers } from '@/modules/messaging/whatsapp/templates/sync/template-numbers.service';
import { TemplateAdmin } from './template-admin';
import { TemplateManagerGuard } from './template-manager.guard';
import { TemplateStarters } from './template-starters';

/**
 * The admin's edits of one template, beside TemplatesController: never a role based on sales,
 * the classroom assistant or teacher (TemplateManagerGuard, 403 allow_list_only); every edit is
 * audited.
 */
@ApiBearerAuth()
@Controller()
export class TemplateEditsController {
  constructor(
    private readonly admin: TemplateAdmin,
    private readonly numbers: TemplateNumbers,
    private readonly starters: TemplateStarters,
    @Inject(TemplateEditor) private readonly editor: TemplateEditor,
  ) {}

  @Route(routes.content)
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  edit(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.content>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.editor.edit(params.key, body, { id: user.id, author: false });
  }

  @Route(routes.submit)
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  submit(
    @RouteInput() { params }: RouteInputOf<typeof routes.submit>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.admin.submit(params.key, user.id);
  }

  @Route(routes.line)
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setLine(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.line>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateMoveView> {
    return this.admin.moveLine({ key: params.key, line: body.line }, user.id);
  }

  @Route(routes.number)
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setNumber(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.number>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateNumberSetView> {
    return this.numbers.setNumber({ key: params.key, number_id: body.number_id }, user.id);
  }

  @Route(routes.crmStatus)
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setCrmStatus(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.crmStatus>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.admin.setCrmStatus({ key: params.key, status: body.status }, user.id);
  }

  @Route(routes.crmName)
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setCrmName(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.crmName>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.admin.setCrmName({ key: params.key, ...body }, user.id);
  }

  @Route(routes.starter)
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setStarter(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.starter>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.starters.set(params.key, body.sales_starter, user.id);
  }
}

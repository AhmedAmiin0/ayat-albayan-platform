import {
  restrictedMay, sendsAllTemplates, templateCatalogRoutes as routes,
  type TemplateHealthView, type TemplateLineView, type TemplateView,
} from '@ab/shared';
import { Controller, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { asResponse } from '@/common/http/returns';
import { TemplateCreator } from '@/modules/messaging/whatsapp/templates/create/template-create';
import { TemplateManagerGuard } from './template-manager.guard';
import { TemplateVerifier } from '@/modules/messaging/whatsapp/templates/sync/template-verifier';
import { TemplateRegistry } from './template.registry';

/**
 * T1–T3 (docs/12 §4): the template registry and its health (R-MSG-01), per number; the edits of
 * one template are TemplateEditsController's. Every route but the list also passes
 * TemplateManagerGuard (403 allow_list_only). templates.manage or templates.send_all list every
 * template; every other role only the restricted allow-list: restrictedMay, the rule the thread
 * send applies.
 */
@ApiBearerAuth()
@Controller()
export class TemplatesController {
  constructor(
    private readonly registry: TemplateRegistry,
    private readonly verifier: TemplateVerifier,
    private readonly creator: TemplateCreator,
  ) {}

  @Route(routes.list)
  async list(@CurrentUser() user: AuthUser): Promise<TemplateView[]> {
    const all = await this.registry.list();
    return asResponse(routes.list.response, sendsAllTemplates(user) ? all : all.filter(restrictedMay));
  }

  @Route(routes.create)
  @UseGuards(TemplateManagerGuard)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.creator.create(body, user.id);
  }

  @Route(routes.lines)
  @UseGuards(TemplateManagerGuard)
  async lines(): Promise<TemplateLineView[]> {
    return asResponse(routes.lines.response, await this.registry.lineViews());
  }

  /**
   * Each line's rows' status, quality and text from its own WABA, and that WABA's new templates
   * imported (flagged only for RESTRICTED_TEMPLATE_DEFAULTS from the chat WABA). A line's read
   * failure is that line's error (200). 409 template_sync_off.
   */
  @Route(routes.health)
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  health(
    @RouteInput() { body, query }: RouteInputOf<typeof routes.health>,
  ): Promise<TemplateHealthView> {
    const { line } = body ?? query;
    return this.verifier.verifyAll(line ? { line } : {});
  }
}

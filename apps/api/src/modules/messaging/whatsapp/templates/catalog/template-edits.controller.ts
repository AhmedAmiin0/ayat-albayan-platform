import {
  templateCrmNameSchema, templateCrmStatusSchema, templateLineSchema, templateNumberSchema,
  templateStarterSchema, type TemplateMoveView, type TemplateNumberSetView, type TemplateView,
} from '@ab/shared';
import { templateEditSchema, templateKeyParam } from '@ab/shared';
import { Controller, HttpCode, Inject, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { TemplateEditor } from '@/modules/messaging/whatsapp/templates/edit/template-editor';
import { TemplateNumbers } from '@/modules/messaging/whatsapp/templates/sync/template-numbers.service';
import { TemplateAdmin } from './template-admin';
import { TemplateManagerGuard } from './template-manager.guard';
import { TemplateStarters } from './template-starters';

/**
 * The admin's edits of one template (docs/12 §4, R-MSG-01), beside TemplatesController on the same
 * routes: templates.manage only, never a role based on sales, the classroom assistant or teacher
 * (TemplateManagerGuard, 403 allow_list_only); every edit is audited.
 */
@ApiTags('messaging')
@ApiBearerAuth()
@Permissions('templates.manage')
@Controller('messaging/templates')
export class TemplateEditsController {
  constructor(
    private readonly admin: TemplateAdmin,
    private readonly numbers: TemplateNumbers,
    private readonly starters: TemplateStarters,
    @Inject(TemplateEditor) private readonly editor: TemplateEditor,
  ) {}

  /** Follows Meta's edit rules; a code-bound template allows word changes only; audited. */
  @Patch(':key/content')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  edit(
    @ZodParam('key', templateKeyParam) key: string,
    @ZodBody(templateEditSchema) input: z.output<typeof templateEditSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.editor.edit(key, input, { id: user.id, author: false });
  }

  /** The only way a template reaches Meta: the admin's explicit, audited act, to its own number. */
  @Post(':key/submit')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  submit(@Param('key') key: string, @CurrentUser() user: AuthUser): Promise<TemplateView> {
    return this.admin.submit(key, user.id);
  }

  /** Moves the template to the other number, then syncs that number; audited. */
  @Patch(':key/line')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setLine(
    @Param('key') key: string,
    @ZodBody(templateLineSchema) input: z.output<typeof templateLineSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateMoveView> {
    return this.admin.moveLine({ key, line: input.line }, user.id);
  }

  /** docs/23c decision 9: null is the role's default; never blocked, only a warning. */
  @Put(':key/number')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setNumber(
    @Param('key') key: string,
    @ZodBody(templateNumberSchema) input: z.output<typeof templateNumberSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateNumberSetView> {
    return this.numbers.setNumber({ key, number_id: input.number_id }, user.id);
  }

  /** Crm line only (docs/19), set by hand; 409 not_crm_line; audited. */
  @Put(':key/crm-status')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setCrmStatus(
    @Param('key') key: string,
    @ZodBody(templateCrmStatusSchema) input: z.output<typeof templateCrmStatusSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.admin.setCrmStatus({ key, status: input.status }, user.id);
  }

  /** docs/19: blank is the default; any line; audited. */
  @Put(':key/crm-name')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setCrmName(
    @Param('key') key: string,
    @ZodBody(templateCrmNameSchema) input: z.output<typeof templateCrmNameSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.admin.setCrmName({ key, ...input }, user.id);
  }

  /**
   * The allow-list: the admin offers a template to the restricted roles (teachers, sales…), or
   * stops; audited.
   */
  @Patch(':key/starter')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  setStarter(
    @Param('key') key: string,
    @ZodBody(templateStarterSchema) input: z.output<typeof templateStarterSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<TemplateView> {
    return this.starters.set(key, input.sales_starter, user.id);
  }
}

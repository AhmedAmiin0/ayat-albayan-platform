import {
  templateCrmNameSchema, templateCrmStatusSchema, templateLineSchema, templateNumberSchema,
  templateStarterSchema, type TemplateMoveView, type TemplateNumberSetView, type TemplateView,
} from '@ab/shared';
import { Controller, HttpCode, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
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
  ) {}

  /** The only way a template reaches Meta: the admin's explicit, audited act, to its own number. */
  @Post(':key/submit')
  @HttpCode(200)
  @UseGuards(TemplateManagerGuard)
  submit(@Param('key') key: string, @CurrentUser() user: AuthUser): Promise<TemplateView> {
    return this.admin.submit(key, user.id);
  }

  /** «نقل إلى الرقم الآخر»: the number it goes from, then that number's sync; audited. */
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

  /**
   * «الرقم» (docs/23c decision 9): the template's own number, null = its role's default; audited.
   * 404 template_not_found / unknown_number. Never blocked: not_approved_on_number only warns.
   */
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

  /**
   * A crm line's template (docs/19): «معتمد في نظام CRM» / «غير متاح في نظام CRM» by hand;
   * 409 not_crm_line; audited.
   */
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

  /**
   * «اسم القالب في واتساب» (docs/19): the WABA name / language every driver sends; blank = the
   * default; any line; audited.
   */
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

import { authorMayEdit, type TemplateEditInput, type TemplateView } from '@ab/shared';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import {
  REGISTRY_ENTITY_ID, toTemplateView,
} from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { submitTemplate } from '@/modules/messaging/whatsapp/templates/sync/template-submit';
import { TemplateVerifier } from '@/modules/messaging/whatsapp/templates/sync/template-verifier';
import {
  WHATSAPP_LINES, type TemplateRow, type WhatsappLines,
} from '@/modules/messaging/whatsapp/whatsapp.types';
import { editOnMeta } from './template-edit.meta';
import { isRefusal, planEdit, type EditPlan } from './template-edit.plan';
import { refusalHttp } from './template-edit.refusal';

/** Who edits: the admin (templates.manage) or an author (templates.author, the allow-list only). */
interface EditActor {
  id: string;
  author: boolean;
}

const notFound = () =>
  new NotFoundException({ code: 'template_not_found', message: 'template_not_found' });

/**
 * «تعديل» (owner 2026-11-14): a template's body, footer and buttons. One Meta knows goes
 * through the line's driver (Meta's edit, back to review; then that line's sync); one never sent
 * is saved here (an author's is then submitted). Audited template_edited.
 */
@Injectable()
export class TemplateEditor {
  private readonly log = new Logger(TemplateEditor.name);

  constructor(
    @Inject(TemplatesRepo) private readonly queries: TemplatesRepo,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(TemplateVerifier) private readonly verifier: TemplateVerifier,
  ) {}

  async edit(key: string, input: TemplateEditInput, actor: EditActor): Promise<TemplateView> {
    const row = await this.editable(key, actor);
    const plan = planEdit(row, input, new Date());
    if (isRefusal(plan)) throw refusalHttp(plan.refused, plan.details);
    if (plan.route === 'meta') await editOnMeta(this.lines, plan.after);
    const saved = await this.queries.update(key, plan.patch, row.status);
    if (!saved) return this.conflict(row);
    await this.record(row, plan, actor);
    await this.after(saved, plan, actor);
    return toTemplateView((await this.queries.get(key)) ?? saved);
  }

  /**
   * Another edit or a sync moved the row while this one ran: Meta may hold this edit's words, so
   * that line's sync reads them back; 409 edit_conflict (the client reloads and looks again).
   */
  private async conflict(row: TemplateRow): Promise<never> {
    await this.refresh(row);
    throw refusalHttp('edit_conflict');
  }

  /** 404, or 403 not_author_editable: an author edits only the allow-list's free templates. */
  private async editable(key: string, actor: EditActor): Promise<TemplateRow> {
    const row = await this.queries.get(key);
    if (!row) throw notFound();
    const refused = actor.author && !authorMayEdit(toTemplateView(row));
    if (refused) throw refusalHttp('not_author_editable');
    return row;
  }

  /** Meta's edit: that line's sync (status, text); an author's never-sent row goes to Meta now. */
  private async after(saved: TemplateRow, plan: EditPlan, actor: EditActor): Promise<void> {
    if (plan.route === 'meta') return this.refresh(saved);
    if (!actor.author) return;
    await this.submit(saved.key, actor.id);
    await this.refresh(saved);
  }

  /** POST …/submit's flow (template-submit.ts) for an author's new or never-sent template. */
  submit(key: string, actorId: string): Promise<TemplateView> {
    const deps = { queries: this.queries, lines: this.lines, audit: this.audit };
    return submitTemplate(deps, key, actorId);
  }

  /** Best effort: the edit stands whatever the sync says; the next sync or webhook catches up. */
  async refresh(row: Pick<TemplateRow, 'line'>): Promise<void> {
    try {
      await this.verifier.verifyAll({ line: row.line });
    } catch (e) {
      this.log.warn(`${row.line} sync after a template edit failed: ${String(e)}`);
    }
  }

  private record(row: TemplateRow, plan: EditPlan, actor: EditActor): Promise<void> {
    const { key, status, body_ar, footer_ar, params, samples, display } = row;
    const next = plan.after;
    return this.audit.record({
      actorId: actor.id,
      entity: 'message_templates',
      entityId: REGISTRY_ENTITY_ID,
      action: 'template_edited',
      before: { key, status, body_ar, footer_ar, params, samples, buttons: display },
      after: {
        key, status: plan.patch.status ?? status, body_ar: next.body_ar, footer_ar: next.footer_ar,
        params: next.params, samples: next.samples, buttons: next.display, route: plan.route,
        by: actor.author ? 'author' : 'admin',
      },
    });
  }
}

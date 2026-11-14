import { randomUUID } from 'node:crypto';
import {
  AUTHOR_DAILY_LIMIT, type TemplateAuthorInput, type TemplateEditInput, type TemplateView,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { templateProblem } from '@/modules/messaging/whatsapp/template-review';
import { requireSync } from '@/modules/messaging/whatsapp/templates/catalog/template-env';
import {
  REGISTRY_ENTITY_ID, toTemplateView,
} from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { TemplateEditor } from '@/modules/messaging/whatsapp/templates/edit/template-editor';
import { refusalHttp } from '@/modules/messaging/whatsapp/templates/edit/template-edit.refusal';
import type { ImportRow } from '@/modules/messaging/whatsapp/templates/sync/template-import';
import { TemplateAuthorRepo } from './template-author.repo';
import { authoredRow, authorKey } from './template-author.row';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The author's list: the allow-list (chat line) and what they wrote themselves. */
const listed = (userId: string) => (t: TemplateView): boolean =>
  (t.sales_starter && t.line === 'chat') || t.created_by === userId;

/**
 * Sales authoring (owner 2026-11-14), templates.author: never the templates.manage routes, never
 * past the allow-list. A new template goes straight to Meta on the chat line, flagged for the
 * allow-list (no admin step by default); 5 a day per user. Audited template_authored (and the
 * submit's template_submitted).
 */
@Injectable()
export class TemplateAuthor {
  constructor(
    private readonly queries: TemplatesRepo,
    private readonly own: TemplateAuthorRepo,
    private readonly audit: AuditService,
    private readonly editor: TemplateEditor,
  ) {}

  async list(userId: string): Promise<TemplateView[]> {
    return (await this.queries.all()).map((r) => toTemplateView(r)).filter(listed(userId));
  }

  /** 429 author_daily_limit, 409 invalid_template / template_exists, then the submit's errors. */
  async create(input: TemplateAuthorInput, userId: string): Promise<TemplateView> {
    requireSync();
    const now = new Date();
    await this.withinQuota(userId, now);
    const key = input.key ?? authorKey(now, randomUUID());
    const row = authoredRow(input, { key, by: userId });
    await this.insert(row);
    await this.audit.record({
      actorId: userId,
      entity: 'message_templates',
      entityId: REGISTRY_ENTITY_ID,
      action: 'template_authored',
      after: { key, line: 'chat', category: input.category, params: row.params, sales_starter: true },
    });
    const view = await this.editor.submit(key, userId);
    await this.editor.refresh(view);
    const fresh = await this.queries.get(key);
    return fresh ? toTemplateView(fresh) : view;
  }

  /** At most AUTHOR_DAILY_LIMIT new templates a user in a rolling day: 429 author_daily_limit. */
  private async withinQuota(userId: string, now: Date): Promise<void> {
    const made = await this.own.createdSince(userId, new Date(now.getTime() - DAY_MS));
    if (made >= AUTHOR_DAILY_LIMIT) throw refusalHttp('author_daily_limit', { max: AUTHOR_DAILY_LIMIT });
  }

  /** Meta's body rules first (409 invalid_template), then a free name (409 template_exists). */
  private async insert(row: ImportRow): Promise<void> {
    const problem = templateProblem({ body_ar: row.body_ar, params: row.params ?? [] });
    if (problem) throw refusalHttp('invalid_template', { reason: problem });
    if (!(await this.queries.create(row))) throw refusalHttp('template_exists', { key: row.key });
  }

  edit(key: string, input: TemplateEditInput, userId: string): Promise<TemplateView> {
    return this.editor.edit(key, input, { id: userId, author: true });
  }
}

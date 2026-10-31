import { templateBlock, withMarks, type MessageTemplateBlock, type MessageView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { StorageService } from '@/common/storage/storage.service';
import { documentLink } from '@/modules/messaging/whatsapp/sender/message.dispatch';
import { needsManualSend, toMessageView, type ThreadMessageRow } from './message.mapper';
import { renderable } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { TemplatesQueries } from '@/modules/messaging/whatsapp/templates/catalog/templates.queries';
import { templateButtons, templateDisplay, templateParams } from './wa-json';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

/**
 * MessageView for one row with its registry template and, while the admin may still send it by
 * hand, the report PDF link (7 days) in the wa.me text. B2's threads can reuse it per row. An
 * edited or deleted message is marked (withMarks, migration 992): a deleted one shows nothing.
 */
@Injectable()
export class MessageViews {
  constructor(
    private readonly templates: TemplatesQueries,
    private readonly storage: StorageService,
  ) {}

  async view(row: ThreadMessageRow, mediaUrl: string | null = null): Promise<MessageView> {
    const template = row.template_key ? await this.templates.cached(row.template_key) : null;
    const params = templateParams(row.template_params);
    const documentUrl = template && needsManualSend(row) ? await documentLink(this.storage, params.document) : null;
    const block = template ? blockOf(row, template) : null;
    const shown = template ? renderable(template) : null;
    return withMarks(toMessageView({ row, template: shown, documentUrl, mediaUrl, block }), row);
  }
}

/**
 * The header, footer and buttons WhatsApp drew around the body (owner 2026-10-28), from the registry
 * row of its key (cached: one read per key, never one per row). Only when the body is the template's
 * own: an imported history row that stored its text renders as before.
 */
export function blockOf(row: ThreadMessageRow, template: TemplateRow): MessageTemplateBlock | null {
  if (row.body !== null) return null;
  const source = { ...template, buttons: templateButtons(template.buttons), display: templateDisplay(template.display) };
  return templateBlock(source, templateParams(row.template_params));
}

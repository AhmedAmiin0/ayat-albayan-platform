import { templateBlock, withMarks, type MessageTemplateBlock, type MessageView } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { StorageService } from '@/common/storage/storage.service';
import { documentLink } from '@/modules/messaging/whatsapp/sender/message.dispatch';
import { needsManualSend, toMessageView, type ThreadMessageRow } from './message.mapper';
import { renderable } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { templateButtons, templateDisplay, templateParams } from './wa-json';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import { withHidden } from './hidden/hidden-view';
import { withCorrection } from './correction/correction-view';
import { TemplateNames } from '@/modules/messaging/whatsapp/templates/names/template-names';
import { asRelayTemplateRow, relayTemplateName } from './relay-view/relay-template-row';
import { CrmSentText } from './crm-sent/crm-sent';
import { orFallback } from '@/common/infra/errors';

/**
 * MessageView for one row with its registry template and, while the admin may still send it by
 * hand, the report PDF link (7 days) in the wa.me text. B2's threads can reuse it per row. An
 * edited or deleted message is marked (withMarks, migration 992): a deleted one shows nothing. A
 * message hidden from the platform (migration 993) is only the placeholder (withHidden).
 */
@Injectable()
export class MessageViews {
  constructor(
    private readonly templates: TemplatesRepo,
    private readonly storage: StorageService,
    private readonly names: TemplateNames,
    /** A row sent through the CRM shows the CRM template's own text. */
    @Optional() @Inject(CrmSentText) private readonly crmSent?: CrmSentText,
  ) {}

  async view(stored: ThreadMessageRow, mediaUrl: string | null = null): Promise<MessageView> {
    return withCorrection(await this.shown(stored, mediaUrl), stored);
  }

  private async shown(stored: ThreadMessageRow, mediaUrl: string | null): Promise<MessageView> {
    if (stored.hidden_at)
      return withHidden(withMarks(toMessageView({ row: stored, template: null }), stored), stored);
    const row = await this.relayed(stored);
    const template = row.template_key ? await this.templates.cached(row.template_key) : null;
    const view = template
      ? await this.templated({ row, template, mediaUrl })
      : toMessageView({ row, template: null, documentUrl: null, mediaUrl, block: null });
    return withMarks(view, row);
  }

  /** Rendered text and block, the PDF link while sendable by hand, a CRM send's own text. */
  private async templated(input: {
    row: ThreadMessageRow;
    template: TemplateRow;
    mediaUrl: string | null;
  }): Promise<MessageView> {
    const { row, template, mediaUrl } = input;
    const params = templateParams(row.template_params);
    const documentUrl = needsManualSend(row)
      ? await documentLink(this.storage, params.document)
      : null;
    const block = blockOf(row, template);
    const shown = renderable(template);
    const view = toMessageView({ row, template: shown, documentUrl, mediaUrl, block });
    return this.crmSent ? this.crmSent.apply(view, { row, template, documentUrl }) : view;
  }

  /** A template the old script sent through the relay, as our own template row (display only). */
  private async relayed(row: ThreadMessageRow): Promise<ThreadMessageRow> {
    const name = relayTemplateName(row);
    if (!name) return row;
    const template = await orFallback(this.names.find(name), null, 'relayed template read');
    return asRelayTemplateRow(row, template);
  }
}

/**
 * The header, footer and buttons WhatsApp drew around the body, from the registry row of its key
 * (cached: one read per key, never one per row). Only when the body is the template's own: an
 * imported history row that stored its text renders as before.
 */
export function blockOf(row: ThreadMessageRow, template: TemplateRow): MessageTemplateBlock | null {
  if (row.body !== null) return null;
  const source = {
    ...template,
    buttons: templateButtons(template.buttons),
    display: templateDisplay(template.display),
  };
  return templateBlock(source, templateParams(row.template_params));
}

import { clickToChatLink, type MessageView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import { CrmCopiesRepo } from './crm-copies.repo';
import { copyFits } from './crm-sent-fit';
import { renderSent, type SentRender } from './crm-sent-render';
import { sentOnCrm, sentTemplate } from './crm-sent-template';

interface SentViewInput {
  row: ThreadMessageRow;
  template: TemplateRow;
  documentUrl?: string | null;
}

/** An outbound template row whose body is the template's own (an imported row keeps its text). */
const templated = (row: ThreadMessageRow): boolean =>
  row.direction === 'outbound' && row.template_key !== null && row.body === null;

const viaCrm = (row: ThreadMessageRow): boolean => templated(row) && sentOnCrm(row);

/** The view with the sent text; a wa.me hand-off (only when the view offers one) carries it too. */
function shownAs(view: MessageView, row: ThreadMessageRow, out: SentRender): MessageView {
  const link = view.click_to_chat ? clickToChatLink(row.phone_e164, out.text) : null;
  return { ...view, body: out.body, template: out.block, click_to_chat: link };
}

/**
 * Owner 2026-11-07 («the reminder is not right»): a template row sent through the CRM shows the
 * CRM template's own text with the values sent, not the registry row of its key. Any other row,
 * a CRM template we hold no copy of yet, or a copy with a {{n}} no sent value fills (copyFits),
 * keeps the registry's rendering.
 */
@Injectable()
export class CrmSentText {
  constructor(@Inject(CrmCopiesRepo) private readonly copies: CrmCopiesRepo) {}

  async apply(view: MessageView, input: SentViewInput): Promise<MessageView> {
    const sent = viaCrm(input.row) ? sentTemplate(input) : null;
    const copy = sent ? await this.copies.find(sent.name, sent.language) : null;
    if (!sent || !copy || !copyFits(copy, sent)) return view;
    const { template, documentUrl } = input;
    return shownAs(view, input.row, renderSent({ copy, sent, key: template.key, documentUrl }));
  }
}

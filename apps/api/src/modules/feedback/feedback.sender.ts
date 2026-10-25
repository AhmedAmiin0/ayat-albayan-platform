import type { TablesInsert } from '@ab/db';
import { Injectable } from '@nestjs/common';
import { Outbox, type Sent } from '../inbox/send/outbox';
import { waHttpError } from '../whatsapp/templates/catalog/template.mapper';
import { TemplateRegistry } from '../whatsapp/templates/catalog/template.registry';

export const FEEDBACK_TEMPLATE = 'lesson_feedback_request';

/** The request message: the approved template, queued and sent now through the inbox Outbox. */
@Injectable()
export class FeedbackSender {
  constructor(
    private readonly templates: TemplateRegistry,
    private readonly outbox: Outbox,
  ) {}

  /** 409 template_not_approved (as H4 answers) until Meta has approved lesson_feedback_request. */
  async assertApproved(): Promise<void> {
    if (!(await this.templates.approved(FEEDBACK_TEMPLATE))) throw waHttpError('template_not_approved', 409);
  }

  send(row: Omit<TablesInsert<'messages'>, 'direction' | 'status' | 'template_key'>): Promise<Sent> {
    return this.outbox.send({ ...row, template_key: FEEDBACK_TEMPLATE });
  }
}

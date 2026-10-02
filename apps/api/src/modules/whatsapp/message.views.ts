import type { MessageView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { StorageService } from '../../common/storage/storage.service';
import { documentLink } from './message.dispatch';
import { needsManualSend, toMessageView, type ThreadMessageRow } from './message.mapper';
import { renderable } from './template.mapper';
import { TemplatesQueries } from './templates.queries';
import { templateParams } from './wa-json';

/**
 * MessageView for one row with its registry template and, while the admin may still send it by
 * hand, the report PDF link (7 days) in the wa.me text. B2's threads can reuse it per row.
 */
@Injectable()
export class MessageViews {
  constructor(
    private readonly templates: TemplatesQueries,
    private readonly storage: StorageService,
  ) {}

  async view(row: ThreadMessageRow, mediaUrl: string | null = null): Promise<MessageView> {
    const template = row.template_key ? await this.templates.get(row.template_key) : null;
    const doc = templateParams(row.template_params).document;
    const documentUrl = template && needsManualSend(row) ? await documentLink(this.storage, doc) : null;
    return toMessageView({ row, template: template ? renderable(template) : null, documentUrl, mediaUrl });
  }
}

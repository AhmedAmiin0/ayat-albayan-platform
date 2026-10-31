import { canHideMessages, canUnhideMessages } from '@ab/shared';
import { ForbiddenException, HttpStatus, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import type { AuthUser } from '@/common/auth/verify-token';
import { waHttpError } from '@/modules/messaging/whatsapp';
import { visibleToSales } from '@/modules/messaging/inbox/sales-threads/sales-threads';
import { MessageHideRepo, type HideTarget } from './message-hide.repo';

export interface HideInput {
  phone: string;
  messageId: string;
  user: AuthUser;
}

/**
 * «حذف من المنصة» (owner 2026-10-30): staff who reply in the inbox (admin, sales) hide a WhatsApp
 * message from every staff screen; the admin shows it again («إظهار»). Nothing goes to WhatsApp
 * (its
 * API cannot delete a sent message): it is still on the customer's phone. Each change is audited.
 */
@Injectable()
export class MessageHideService {
  constructor(
    private readonly repo: MessageHideRepo,
    private readonly audit: AuditService,
  ) {}

  async hide(input: HideInput, now = new Date()): Promise<void> {
    if (!canHideMessages(input.user)) throw new ForbiddenException();
    const row = await this.target(input);
    const changed = await this.repo.set({ id: row.id, by: input.user.id, at: now.toISOString() });
    if (changed) await this.record({ input, action: 'message_hidden', after: now.toISOString() });
  }

  async unhide(input: HideInput, now = new Date()): Promise<void> {
    if (!canUnhideMessages(input.user)) throw new ForbiddenException();
    const row = await this.target(input);
    const changed = await this.repo.set({ id: row.id, by: null, at: now.toISOString() });
    if (changed)
      await this.record({ input, action: 'message_unhidden', after: null, before: row.hidden_at });
  }

  /** 404 for another chat's message or one sales may not read (never reveal it). */
  private async target(input: HideInput): Promise<HideTarget> {
    const row = await this.repo.target(input.messageId);
    const salesWall = row !== null && input.user.role === 'sales' && !visibleToSales(row);
    if (row?.phone_e164 !== input.phone || salesWall) {
      throw waHttpError('message_not_found', HttpStatus.NOT_FOUND);
    }
    return row;
  }

  private record(e: {
    input: HideInput;
    action: string;
    after: string | null;
    before?: string | null;
  }) {
    return this.audit.record({
      actorId: e.input.user.id,
      entity: 'messages',
      entityId: e.input.messageId,
      action: e.action,
      before: { hidden_at: e.before ?? null },
      after: { hidden_at: e.after },
    });
  }
}

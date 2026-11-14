import type { ReopenFields, ThreadView, WaLine } from '@ab/shared';
import { reopenChoiceOf } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import {
  DAY_MS,
  nextReopenKey,
  reopenLive,
} from '@/modules/messaging/whatsapp/sender/window/reopen-state';
import { WindowSettings } from '@/modules/messaging/whatsapp/sender/window/window.settings';
import { ReopenPickRepo, type ReopenBubble } from './reopen-pick.repo';

/** A staff-picked reopen send: its dedup key in the `reopen:` family, and its 24 h life. */
export interface ReopenStamp {
  dedup: string;
  expiresAt: string;
}

/** The picked template's line, and when it is sent. */
export interface PickAt {
  phone: string;
  line: WaLine;
  now: Date;
}

const last4 = (phone: string): string => `…${phone.slice(-4)}`;
const dayBefore = (now: Date): Date => new Date(now.getTime() - DAY_MS);

/** The sent bar's fields: the newest live reopen of the last 24 h, as ReopenSent. */
const sentOf = (rows: readonly ReopenBubble[], now: Date): ReopenFields['reopen_sent'] => {
  const live = rows.find((r) => reopenLive(r, now));
  return live ? { id: live.id, template_key: live.template_key ?? '', status: live.status } : null;
};

/**
 * «إعادة فتح المحادثة» (owner 2026-11-14, «like Kapso»): a staff member picks the template that
 * reopens a closed chat. The picked send takes the next `reopen:<E.164>:<day>[:<try>]` key, the
 * same family the window hold reads (reopenLive), so the hold never queues a second, automatic
 * template for that window; a live one already there refuses it (409 reopen_live), so does a day
 * whose tries are used (409 reopen_tries_used). Only a chat-line template reopens the chat line.
 */
@Injectable()
export class ReopenPick {
  private readonly log = new Logger('ReopenPick');

  constructor(
    private readonly repo: ReopenPickRepo,
    private readonly settings: WindowSettings,
  ) {}

  /** The picked template's stamp; throws the reason it cannot reopen this chat now. */
  async stamp(at: PickAt): Promise<ReopenStamp> {
    if (at.line !== 'chat') throw waHttpError('reopen_not_chat_line', 400);
    const rows = await this.repo.since(at.phone, dayBefore(at.now));
    if (rows.some((r) => reopenLive(r, at.now))) throw waHttpError('reopen_live', 409);
    const dedup = nextReopenKey(at.phone, rows, at.now);
    if (!dedup) throw waHttpError('reopen_tries_used', 409);
    return { dedup, expiresAt: new Date(at.now.getTime() + DAY_MS).toISOString() };
  }

  /**
   * The thread page's reopen fields while its window is closed: the live reopen (the bar's
   * tick) and the academy's `chat_reopen_template` (the picker's first pick). Never throws.
   */
  async thread<T extends ThreadView>(view: T, now: Date): Promise<T> {
    if (view.session_open) return view;
    try {
      const [rows, settings] = await Promise.all([
        this.repo.since(view.phone_e164, dayBefore(now)),
        this.settings.read(),
      ]);
      return { ...view, reopen_sent: sentOf(rows, now), ...preferred(settings.chat_reopen_template) };
    } catch (e) {
      this.log.warn(`reopen state not read for ${last4(view.phone_e164)}: ${String(e)}`);
      return view;
    }
  }
}

/** The setting's key when it names a template («بدون قالب» names none). */
const preferred = (setting: string): Pick<ReopenFields, 'reopen_template'> => {
  const key = setting.trim();
  return key && reopenChoiceOf(key) === 'template' ? { reopen_template: key } : {};
};

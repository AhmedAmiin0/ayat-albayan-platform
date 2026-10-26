import type { MeetingInviteChannel, MeetingInviteStatus } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../../../../../common/push/push.service';
import { pickSend } from '../../../../messaging/inbox/send/send-number';
import { ThreadsQueries } from '../../../../messaging/inbox/threads/threads.queries';
import { MessageSender } from '../../../../messaging/whatsapp/sender/message.sender';
import type { StoredInvitee } from './meeting-invitees.queries';
import { whenText } from './meeting-invite.text';

/** What one delivery did; written on the invitee row by the caller. */
export interface DeliveryOutcome {
  status: MeetingInviteStatus;
  channel: MeetingInviteChannel;
  error_code: string | null;
}

interface StaffNotice {
  meeting: { id: string; title: string; starts_at: string | null };
  invitee: StoredInvitee;
  /** PushService subject (dedup): inviteSubject(), or `cancel:<meeting>`. */
  subject: string;
  /** Replaces «دعوة إلى اجتماع» (a reschedule, a cancellation). */
  title?: string;
}

interface ChatSend {
  phone: string;
  body: string;
  dedupKey: string;
  actorId: string;
  /** A teacher's text names them (messages.sent_by_teacher_id, like an inbox reply); admin / sales: null. */
  teacherId: string | null;
  /** The row is dropped (never sent late) after this instant. */
  expiresAt: string;
  now: Date;
}

/**
 * The two channels of a meeting invitation (R-MEET-02). Staff: one bell row (+ push) through
 * PushService.notifyProfiles, kind meeting_invite, keyed by subject (rule 8). Others: a WhatsApp
 * SESSION TEXT queued like an inbox reply (the line replyLine picks, docs/12 §13.3; in module mode the number
 * replyNumber picks, docs/23c decision 6); never a template.
 * No thread or every window closed → window_closed, nothing queued. The queued row goes out through the
 * usual sender and its gates (WhatsApp configured, WA_ALLOWED_RECIPIENTS, settings.messaging_enabled).
 * Never throws: one recipient's failure never fails the others.
 */
@Injectable()
export class MeetingInviteSender {
  private readonly log = new Logger(MeetingInviteSender.name);

  constructor(
    private readonly push: PushService,
    private readonly threads: ThreadsQueries,
    private readonly sender: MessageSender,
  ) {}

  async staff(n: StaffNotice): Promise<DeliveryOutcome> {
    if (!n.invitee.profile_id) return { status: 'failed', channel: 'in_app', error_code: 'no_profile' };
    await this.push.notifyProfiles({
      kind: 'meeting_invite',
      subject: n.subject,
      vars: { title: n.meeting.title, when: whenText(n.meeting.starts_at, n.invitee.tz) },
      data: { meetingId: n.meeting.id },
      profileIds: [n.invitee.profile_id],
      ...(n.title ? { title: n.title } : {}),
    });
    return { status: 'sent', channel: 'in_app', error_code: null };
  }

  /** Queues the chat text when a window is open; the sender is kicked once by the caller (kick()). */
  async chat(s: ChatSend): Promise<DeliveryOutcome> {
    try {
      const thread = await this.threads.thread(s.phone);
      const picked = await pickSend({ thread, now: s.now, windows: () => this.threads.numberWindows(s.phone) });
      if ('code' in picked) return { status: 'window_closed', channel: 'link', error_code: picked.code };
      await this.threads.enqueue({
        direction: 'outbound',
        status: 'queued',
        phone_e164: s.phone,
        lead_id: thread?.lead_id ?? null,
        guardian_id: thread?.guardian_id ?? null,
        created_by: s.actorId,
        sent_by_teacher_id: s.teacherId,
        dedup_key: s.dedupKey,
        body: s.body,
        expires_at: s.expiresAt,
        ...picked,
      });
      return { status: 'sent', channel: 'whatsapp', error_code: null };
    } catch (e) {
      // The race-safe daily cap (migration 414's trigger): this recipient failed, the others go on.
      if (e instanceof Error && /\binvite_limit\b/.test(e.message)) return { status: 'failed', channel: 'link', error_code: 'invite_limit' };
      this.log.warn(`meeting invite chat failed: ${e instanceof Error ? e.message : String(e)}`);
      return { status: 'failed', channel: 'link', error_code: 'send_failed' };
    }
  }

  kick(): void {
    void this.sender.kick();
  }
}

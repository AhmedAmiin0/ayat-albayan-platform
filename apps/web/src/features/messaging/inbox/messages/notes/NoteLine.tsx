import { adWelcomeOf, messageNote, noteText, type MessageView } from '@ab/shared';
import { LinkedBody } from '@/components/ui/display/linked-body';
import { NOTE_WORDS } from '@/features/messaging/inbox/format';

/**
 * What a bubble shows instead of its own content (owner 2026-10-30): «تم حذف هذه الرسالة» for a
 * message deleted for everyone, the ad's own welcome text (else «رسالة الترحيب من الإعلان») and
 * «رسالة غير مدعومة», muted as WhatsApp words them; nothing for any other message.
 */
export function NoteLine({ message: m }: { message: MessageView }) {
  const note = messageNote(m);
  if (!note) return null;
  const welcome = note === 'ad_welcome' ? adWelcomeOf(m.interactive_payload) : null;
  if (welcome) return <LinkedBody text={welcome} />;
  return <p className="text-xs italic text-ink-3">{noteText(m, NOTE_WORDS)}</p>;
}

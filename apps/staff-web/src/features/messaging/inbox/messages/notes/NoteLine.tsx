import { adWelcomeOf, messageNote, noteText, type MessageView } from '@ab/shared';
import { LinkedBody } from '@ab/web-kit';
import { NOTE_WORDS } from '@/features/messaging/inbox/format';

export function NoteLine({ message: m }: { message: MessageView }) {
  const note = messageNote(m);
  if (!note) return null;
  const welcome = note === 'ad_welcome' ? adWelcomeOf(m.interactive_payload) : null;
  if (welcome) return <LinkedBody text={welcome} />;
  return <p className="text-xs italic text-ink-3">{noteText(m, NOTE_WORDS)}</p>;
}

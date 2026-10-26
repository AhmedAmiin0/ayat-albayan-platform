import { t } from '@/core/lib/i18n/i18n';
import { type } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { useSmall } from '../components/MessageMeta';
import type { MediaProblem } from './media-problem';

/** A short line in place of a file the bubble cannot show. */
export function MediaNote({ text }: { text: string }) {
  const small = useSmall();
  return (
    <AppText accessibilityRole="text" style={{ ...small, fontFamily: type.ui[600] }}>
      {text}
    </AppText>
  );
}

/** What the bubble says for a problem that ends there; null for one worth another try. */
export function problemText(problem: MediaProblem, kind: string): string | null {
  if (problem === 'expired') return t.inbox.mediaExpired;
  if (problem === 'forbidden') return `${kind} · ${t.inbox.mediaNotAllowed}`;
  if (problem === 'crm') return t.inbox.mediaInCrm;
  return null;
}

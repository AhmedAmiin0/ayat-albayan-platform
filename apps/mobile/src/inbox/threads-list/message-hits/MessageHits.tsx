import type { MessageSearchHit } from '@ab/shared';
import { type Href, router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, type TreeBase } from '@/core/nav/tree-base';
import { Button } from '@/core/ui/primitives/Button';
import { AppText } from '@/core/ui/primitives/AppText';
import { InsetGroup } from '@/core/ui/surface/inset';
import { threadLink, type ThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { type, useTheme } from '@/theme';
import { MessageHitRow } from './MessageHitRow';
import type { MessageHitsState } from './use-message-hits';

interface MessageHitsProps {
  /** The settled words of the chats' search box. */
  q: string;
  found: MessageHitsState;
  mode: ThreadMode;
  base: TreeBase;
  /** The list's one clock (useToday): the hits' days switch at midnight with the chats'. */
  now: Date;
}

/** The chat at the hit, in this tree: the same href its chats row pushes, plus `?msg=`. */
export const hitHref = (hit: MessageSearchHit, input: { mode: ThreadMode; base: TreeBase }): Href =>
  inTree(input.base, `${threadLink(hit.phone_e164, input.mode)}?msg=${hit.id}` as Href);

type Phase = 'searching' | 'failed' | 'empty' | 'found';

const phaseOf = (found: MessageHitsState): Phase => {
  const phases: [boolean, Phase][] = [
    [found.searching, 'searching'],
    [found.failed && found.hits.length === 0, 'failed'],
    [found.hits.length === 0, 'empty'],
  ];
  return phases.find(([on]) => on)?.[1] ?? 'found';
};

const LINE: Record<Exclude<Phase, 'found'>, () => string> = {
  searching: () => t.inbox.chatSearch.searching,
  failed: () => t.inbox.messageSearch.failed,
  empty: () => t.inbox.messageSearch.empty,
};

/**
 * «الرسائل» under the chats (docs/37 NEW 1): from 3 characters, the messages holding the words,
 * newest first, «عرض مزيد من الرسائل» while older ones remain (the 1–2-character hint is the list's
 * header, SearchHead). The hits sit in one inset card, as the chats. The chips filter the chats
 * only: the hits follow the role's scope alone.
 */
export function MessageHits({ q, found, mode, base, now }: MessageHitsProps) {
  const { color } = useTheme();
  const phase = phaseOf(found);
  const note = { fontSize: type.size.xs, color: color.ink3, paddingHorizontal: 16 };
  if (!found.asked) return null;
  const teacher = mode.kind === 'teacher';
  const open = (hit: MessageSearchHit) => router.push(hitHref(hit, { mode, base }));
  return (
    <View testID="message-hits" style={{ gap: 8, paddingTop: 12 }}>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[600], color: color.ink2, paddingHorizontal: 16 }}
      >
        {t.inbox.messageSearch.section}
      </AppText>
      {phase === 'found' ? null : <AppText style={note}>{LINE[phase]()}</AppText>}
      <InsetGroup testID="message-hits-card">
        {found.hits.map((hit) => (
          <MessageHitRow key={hit.id} hit={hit} q={q} now={now} onOpen={open} teacher={teacher} />
        ))}
      </InsetGroup>
      {found.more ? (
        <Button variant="ghost" label={t.inbox.messageSearch.more} onPress={found.loadMore} />
      ) : null}
    </View>
  );
}

import type { NotificationEntryView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { RuleCheck } from '../RuleCheck';
import { availableChannels, channelWords, fillText } from '../rule-text';
import type { RuleRowState } from '../use-rule-row';

const r = t.notificationRules;

/**
 * «عبر»: the row's channels. With an editable row the optional ones are checkboxes and the others
 * stay fixed («واتساب دائمًا»); otherwise the channels in words.
 */
export function ChannelsPart({ entry, row }: { entry: NotificationEntryView; row: RuleRowState | null }) {
  const name = t.notificationCatalogue.entries[entry.key].name;
  if (!row || row.rule.optional_channels.length === 0) {
    return <span className="text-xs text-ink-2">{channelWords(row ? row.draft.channels : (entry.rule?.channels ?? entry.channels))}</span>;
  }
  const optional = row.rule.optional_channels;
  const all = availableChannels(entry);
  return (
    <span className="grid gap-0.5">
      {all
        .filter((ch) => !optional.includes(ch))
        .map((ch) => (
          <span key={ch} className="text-xs text-ink-2">
            {fillText(r.channelFixed, { channel: t.notificationCatalogue.channels[ch] })}
          </span>
        ))}
      {all
        .filter((ch) => optional.includes(ch))
        .map((ch) => {
          const word = t.notificationCatalogue.channels[ch];
          return (
            <RuleCheck
              key={ch}
              label={word}
              ariaLabel={fillText(r.channelToggle, { channel: word, name })}
              checked={row.draft.channels.includes(ch)}
              disabled={row.saving}
              onChange={(on) => row.set({ channels: on ? [...row.draft.channels, ch] : row.draft.channels.filter((x) => x !== ch) })}
            />
          );
        })}
    </span>
  );
}

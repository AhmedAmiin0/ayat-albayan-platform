import { SegmentedControl } from '@ab/web-kit/components/ui/form/segmented-control';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useCallsEnabled } from '@/features/messaging/calls/state/call-context';

/** Only while calls are on (docs/28 §5). */
export function CallsTabs({ calls, onPick }: { calls: boolean; onPick: (calls: boolean) => void }) {
  if (!useCallsEnabled()) return null;
  return (
    <SegmentedControl
      className="mb-3"
      label={t.calls.log.title}
      value={calls ? 'calls' : 'chats'}
      options={[
        { value: 'chats', label: t.calls.log.chats },
        { value: 'calls', label: t.calls.log.title },
      ]}
      onChange={(v) => onPick(v === 'calls')}
    />
  );
}

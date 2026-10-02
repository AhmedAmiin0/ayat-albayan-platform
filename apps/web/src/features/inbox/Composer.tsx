import type { ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { settingsQuery } from '@/features/messaging/api';
import { t } from '@/lib/i18n';
import { sessionUntil } from './format';
import { TemplateComposer } from './TemplateComposer';
import { TextComposer } from './TextComposer';
import type { PrefillContext } from './template-params';

type Mode = 'text' | 'template';

const hamish = 'border-s-[3px] border-double border-s-gold-soft ps-3 text-xs text-ink-2';

/**
 * Reply box (R-LEAD-02). Inside the 24 h window: a plain message, or a template. After it: the
 * fixed notice (inbox.sessionClosed) and approved templates only. While the admin's kill switch is
 * off, a note says messages wait in the queue (they are saved, never lost).
 */
export function Composer({ thread, context }: { thread: ThreadView; context: PrefillContext }) {
  const settings = useQuery(settingsQuery);
  const [mode, setMode] = useState<Mode>('text');
  const open = thread.session_open;

  return (
    <div className="mt-4 grid gap-3 border-t-[3px] border-double border-gold pt-4">
      {settings.data?.messaging_enabled === false && <p className={hamish}>{t.inbox.messagingOff}</p>}
      {open ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {thread.last_inbound_at && <p className="text-xs text-ink-3">{sessionUntil(thread.last_inbound_at)}</p>}
          <SegmentedControl<Mode>
            label={t.inbox.composer.sendTemplate}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'text', label: t.inbox.composer.modeText },
              { value: 'template', label: t.inbox.composer.modeTemplate },
            ]}
          />
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <NuqtaGlyph shape="hollow" className="text-ink-3" />
          <span>{t.inbox.sessionClosed}</span>
        </p>
      )}
      {open && mode === 'text' ? (
        <TextComposer phone={thread.phone_e164} />
      ) : (
        <TemplateComposer phone={thread.phone_e164} context={context} />
      )}
    </div>
  );
}

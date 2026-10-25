import type { NotificationAudience } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { Skeleton } from '@/components/ui/display/skeleton';
import { usePermissions } from '@/features/auth/use-permissions';
import { t } from '@/lib/i18n/i18n';
import { settingsQuery } from '@/lib/settings/settings-api';
import type { AudienceTab } from '../notification-catalogue/catalogue-tabs';
import { NumbersLine } from '../notification-catalogue/NumbersLine';
import { useCatalogue } from '../notification-catalogue/use-catalogue';
import { numbersQuery } from '../numbers/numbers-api';
import { useRuleDrafts, type RuleDrafts } from './rule-drafts';
import { RulesContext } from './rules-context';
import { canManageNotifications } from './rules-api';
import { RulesHead } from './RulesHead';
import { RulesStateStrip } from './RulesStateStrip';
import { RulesTable } from './RulesTable';

const r = t.notificationRules;
const c = t.notificationCatalogue;

/** Loading: row-shaped bars and the words for screen readers; no role (the page owns role=status). */
function Loading() {
  return (
    <div aria-busy="true" className="grid gap-3 py-3">
      <span className="sr-only">{t.common.loading}</span>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className={i % 2 ? 'w-2/3' : 'w-1/2'} />
      ))}
    </div>
  );
}

interface RulesSectionProps {
  onSaved: (message: string) => void;
  drafts?: RuleDrafts | undefined;
  /** The audience tab to start on (`?audience=`, from «نظرة عامة»); the tabs are local after that. */
  audience?: NotificationAudience | undefined;
}

/**
 * «التواصل» › «الإشعارات» (docs/26b §3, docs/23b): every notification, one audience at a time, each
 * row editable on its own with notifications.manage (timing, channels, number, switch) and read-only
 * without it. GET /admin/notifications (v2: `rule`, `approval`, `reach`), GET /admin/numbers.
 * `drafts` comes from «التواصل» (so a tab switch keeps them); alone, the section holds its own.
 */
export function RulesSection({ onSaved, drafts, audience }: RulesSectionProps) {
  const settings = useQuery(settingsQuery);
  const numbers = useQuery(numbersQuery);
  const canManage = canManageNotifications(usePermissions().permissions);
  // Refetched whenever the settings, «التكاملات» or a line check change; first fetch once settings are in.
  const list = useCatalogue();
  const own = useRuleDrafts();
  const held = drafts ?? own;
  const [tab, setTab] = useState<AudienceTab>(audience ?? 'guardian');
  const [live, setLive] = useState('');
  const api = { canManage, numbers: numbers.data ?? [], reach: list.data?.reach, onSaved, drafts: held, announce: setLive };
  const showFirstUnsaved = () => {
    const first = list.data?.entries.find((e) => e.key === held.keys[0]);
    if (first) setTab(first.manual ? 'manual' : first.audience);
  };
  return (
    <RulesContext.Provider value={api}>
      <div className="grid min-w-0 gap-2" aria-labelledby="notification-rules-title" role="region">
        <RulesHead canManage={canManage} unsaved={held.keys.length} onUnsaved={showFirstUnsaved} />
        {settings.data && <RulesStateStrip settings={settings.data} />}
        <p className="max-w-[70ch] text-xs text-ink-2">{canManage ? r.intro : r.readOnlyHint}</p>
        {list.isPending && <Loading />}
        {list.isError && (
          <div className="grid justify-items-start gap-2">
            <p role="alert" className="flex items-start gap-2 text-sm text-danger">
              <NuqtaGlyph shape="struck" className="mt-1" />
              <span>{c.loadError}</span>
            </p>
            <Button size="sm" variant="secondary" onClick={() => void list.refetch()}>
              {c.retry}
            </Button>
          </div>
        )}
        {list.data && (
          <>
            <NumbersLine lines={list.data.lines} />
            <RulesTable entries={list.data.entries} lines={list.data.lines} tab={tab} onTab={setTab} />
          </>
        )}
        {/* One polite region, always mounted and empty until a row's save fails (docs/26b §7b). */}
        <p aria-live="polite" className="sr-only" data-testid="rules-live">
          {live}
        </p>
      </div>
    </RulesContext.Provider>
  );
}

import { useId } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { useWebPush } from '@ab/web-kit/push/use-web-push';
import { PUSH_MESSAGE } from '@ab/web-kit/push/web-push-message';
import { PushSwitch } from './PushSwitch';
import { SettingRow } from './SettingRow';

/**
 * «إشعارات المتصفح» as a settings row (boards: «حسابي»), the bell panel's WebPushToggle in the
 * family look: the same states and the same act (useWebPush), a switch in place of the button.
 * `hint`: what the notices are about (guardian or student wording).
 */
export function PushRow({ hint }: { hint: string }) {
  const push = useWebPush();
  const titleId = useId();
  const on = push.view === 'on';
  const toggles = on || push.view === 'off';
  const state = (
    <>
      <p className="text-xs text-pretty text-ink-2">{hint}</p>
      <p className={cn('flex items-start gap-1 text-xs text-pretty', on ? 'text-lapis' : 'text-ink-3')}>
        {on && <Icon name="check" className="mt-0.5 size-3.5 shrink-0" />}
        {PUSH_MESSAGE[push.view]}
      </p>
      {push.failed && <p role="alert" className="text-xs text-danger">{t.bell.push.failed}</p>}
    </>
  );
  const control = toggles ? (
    <PushSwitch on={on} busy={push.busy} labelledBy={titleId}
      onToggle={on ? push.disable : push.enable} />
  ) : null;
  return (
    <SettingRow icon="bell" tone="green" title={t.bell.push.title} titleId={titleId}
      hint={state} control={control} />
  );
}

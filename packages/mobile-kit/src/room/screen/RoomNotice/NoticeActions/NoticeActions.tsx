import { t } from '../../../../lib/i18n/i18n';
import { Button } from '../../../../ui';
import type { NoticeActionsProps } from './NoticeActions.types';

export function NoticeActions({ again, browser, onBack }: NoticeActionsProps) {
  return (
    <>
      {again ? <Button label={again.label} onPress={again.onPress} /> : null}
      {browser ? (
        <Button label={browser.label} variant="secondary" onPress={browser.onPress} />
      ) : null}
      {onBack ? <Button label={t.mobileRoom.back} variant="secondary" onPress={onBack} /> : null}
    </>
  );
}

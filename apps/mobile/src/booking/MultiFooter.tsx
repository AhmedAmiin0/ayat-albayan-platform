import { pickProgress } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { type, useTheme } from '@/theme';
import { PicksList } from './PicksList';
import type { SlotMulti } from './SlotStep';

export interface MultiFooterProps {
  multi: SlotMulti;
  /** The family's zone: each picked day's weekday and time. */
  tz: string;
}

/**
 * Under a package's slots: the picked days (each removable), how many are still missing or one too
 * many («اخترت 1 من 2 — بقي يوم واحد»), and «التالي» once they are enough.
 */
export function MultiFooter({ multi, tz }: MultiFooterProps) {
  const { color } = useTheme();
  const { picks, need } = multi;
  const ready = picks.length > 0 && (need === undefined || picks.length === need);
  const progress = need ? pickProgress(t.booking, picks.length, need) : null;
  return (
    <>
      <PicksList picks={picks} tz={tz} onRemove={(p) => multi.onChange(picks.filter((x) => x !== p))} />
      {progress ? (
        <AppText
          accessibilityLiveRegion="polite"
          style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 }}
        >
          {progress}
        </AppText>
      ) : null}
      <Button label={t.booking.next} disabled={!ready} onPress={multi.onNext} />
    </>
  );
}

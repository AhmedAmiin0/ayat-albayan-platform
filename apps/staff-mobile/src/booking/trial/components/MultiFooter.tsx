import { pickProgress } from '@ab/schedule';
import { t, AppText, Button, type, useTheme } from '@ab/mobile-kit';
import { PicksList } from '@/booking/shared/PicksList';
import type { SlotMulti } from './SlotStep';

interface MultiFooterProps {
  multi: SlotMulti;
  /** The family's zone: each picked day's weekday and time. */
  tz: string;
}

/** Next opens once enough days are picked. */
export function MultiFooter({ multi, tz }: MultiFooterProps) {
  const { color } = useTheme();
  const { picks, need } = multi;
  const ready = picks.length > 0 && (need === undefined || picks.length === need);
  const progress = need ? pickProgress(t.booking, picks.length, need) : null;
  return (
    <>
      <PicksList
        picks={picks}
        tz={tz}
        onRemove={(p) => multi.onChange(picks.filter((x) => x !== p))}
      />
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

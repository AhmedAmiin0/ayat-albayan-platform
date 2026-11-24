import type { OutsideSlot } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, FilterPills, freeSlotDays, Note, SlotButton, WarnLine } from '@ab/mobile-kit';
import { useViewerClock } from '@/core/lib/clock';
import type { OtherTimeProps } from './OtherTime';
import { OtherTimeStatus } from './OtherTimeStatus';
import { useOutsideSlots } from './use-outside-slots';

/** Picked, never typed; a time outside teacher hours warns before continuing. */
export function OtherTimeList({ tz, onPick, ...params }: OtherTimeProps) {
  const viewer = useViewerClock();
  const read = useOutsideSlots(params);
  const days = freeSlotDays(read.data?.slots ?? [], viewer.tz);
  const [day, setDay] = useState<string | null>(null);
  const [picked, setPicked] = useState<OutsideSlot | null>(null);
  const shown = days.find((d) => d.date === day) ?? days[0];
  const items = days.map((d) => ({ value: d.date, label: d.label }));
  const choose = (startsAt: string) =>
    setPicked(shown?.slots.find((s) => s.starts_at === startsAt) ?? null);
  if (!shown) return <OtherTimeStatus read={read} />;
  return (
    <View style={{ gap: 10 }}>
      <Note>{t.booking.otherTimeHint}</Note>
      <FilterPills
        items={items}
        value={shown.date}
        onChange={setDay}
        accessibilityLabel={t.booking.otherTimeDay}
        role="radiogroup"
        wrap
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {shown.slots.map((s) => (
          <SlotButton
            key={s.starts_at}
            startsAt={s.starts_at}
            tz={tz}
            viewer={viewer}
            selected={picked?.starts_at === s.starts_at}
            onPick={choose}
          />
        ))}
      </View>
      {picked && !picked.inside_hours ? <WarnLine message={t.booking.outsideHours} /> : null}
      {picked ? (
        <Button
          label={t.booking.next}
          onPress={() => onPick(picked.starts_at, !picked.inside_hours)}
        />
      ) : null}
    </View>
  );
}

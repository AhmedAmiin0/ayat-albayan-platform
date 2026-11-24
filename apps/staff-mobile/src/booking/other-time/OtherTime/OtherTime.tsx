import { useState } from 'react';
import { View } from 'react-native';
import { t, Button } from '@ab/mobile-kit';
import type { OtherTimeProps } from './OtherTime.types';
import { OtherTimeList } from '@/booking/other-time/OtherTimeList';

/** Opens every start of the next two weeks, from the server. */
export function OtherTime(props: OtherTimeProps) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <Button
        variant="secondary"
        label={open ? t.booking.otherTimeHide : t.booking.otherTime}
        onPress={() => setOpen(!open)}
      />
      {open ? <OtherTimeList {...props} /> : null}
    </View>
  );
}

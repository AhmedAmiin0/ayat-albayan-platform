import { useRef, useState } from 'react';
import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { space, type, useTheme } from '../../../theme';
import { AppText } from '../../primitives/AppText';
import { Button } from '../../primitives/Button';
import { Sheet } from './Sheet';
import type { SheetProps } from './Sheet.types';

type Case = Pick<SheetProps, 'title' | 'size' | 'scroll' | 'surface'> & {
  key: string;
  rows: number;
  dir: 'rtl' | 'ltr';
};

const L = t.mobileRoom.leaveAsk;

/** Each state a sheet shows; dark mode and Reduce Motion follow the device settings. */
const CASES: Case[] = [
  { key: 'fit', title: L.title, rows: 1, dir: 'rtl' },
  { key: 'untitled', rows: 2, dir: 'rtl' },
  { key: 'large', title: t.classroom.people, size: 'large', scroll: true, rows: 30, dir: 'rtl' },
  { key: 'room', title: L.title, surface: 'page', rows: 1, dir: 'rtl' },
  { key: 'ltr', title: L.title, rows: 1, dir: 'ltr' },
];

/** The kit Sheet in every state, each opened from a 44 px kit Button that takes focus back. */
export function SheetShowcase() {
  const { color } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const opener = useRef<View>(null);
  return (
    <View ref={opener} style={{ gap: space[2], padding: space[4] }}>
      {CASES.map((c) => (
        <View key={c.key} style={{ direction: c.dir }}>
          <Button variant="secondary" label={c.key} onPress={() => setOpen(c.key)} />
          <Sheet
            {...c}
            open={open === c.key}
            onClose={() => setOpen(null)}
            testID={`showcase-${c.key}`}
            label={c.title ?? L.title}
            returnFocus={opener}
          >
            {Array.from({ length: c.rows }, (_, i) => (
              <AppText key={i} style={{ fontSize: type.size.sm, color: color.ink2 }}>
                {L.body}
              </AppText>
            ))}
            <Button variant="secondary" label={t.common.close} onPress={() => setOpen(null)} />
          </Sheet>
        </View>
      ))}
    </View>
  );
}

import { Pressable, View } from 'react-native';
import { StatusChip, t } from '@ab/mobile-kit';
import { FamilyBell } from '@/nav/FamilyBell';
import { openChildSwitch } from '@/nav/switch-store';
import { ROW, switchRow } from './greeting-header.helpers';
import type { GreetingHeaderProps } from './GreetingHeader.types';
import { useGreetingHeader } from './use-greeting-header';
import { Who } from './Who';

/** A test-account badge (docs/56) so nobody mistakes it for a real family. */
export function GreetingHeader({ title, over, student }: GreetingHeaderProps) {
  const { line, switches, isTest, switchLabel } = useGreetingHeader({ title, over, student });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      {switches ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={switchLabel}
          onPress={openChildSwitch}
          style={switchRow}
        >
          <Who title={title} over={line} student={student} switches />
        </Pressable>
      ) : (
        <View style={ROW}>
          <Who title={title} over={line} student={student} switches={false} />
        </View>
      )}
      {isTest && <StatusChip tone="act" glyph="hollow" size="sm" label={t.testAccounts.chip} />}
      <FamilyBell />
    </View>
  );
}

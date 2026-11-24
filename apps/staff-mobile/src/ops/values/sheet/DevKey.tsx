import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t, type, useTheme, AppText, Ltr } from '@ab/mobile-kit';

export function DevKey({ settingKey }: { settingKey: string }) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const small = { fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink3 };
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <AppText style={{ ...small, fontFamily: type.ui[500] }}>{t.settingsValues.sheet.dev}</AppText>
      </Pressable>
      {open ? <Ltr style={{ ...small, fontFamily: type.ui[400] }}>{settingKey}</Ltr> : null}
    </View>
  );
}

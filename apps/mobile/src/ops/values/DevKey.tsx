import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Ltr } from '@/ui/Ltr';

/** «للمطوّر», closed by default: opens to the setting's key (LTR), as the web sheet's <details>. */
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

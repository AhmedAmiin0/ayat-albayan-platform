import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { setLocale } from '@/lib/locale-switch';
import { InlineConfirm } from '@/ui/InlineConfirm';
import { ListRow } from '@/ui/ListRow';
import { Section } from './Section';

/**
 * «اللغة»: offers the other language by its own name (العربية / English). Every screen reads its
 * strings once, at start, so switching restarts the app: one short confirm first.
 */
export function LanguageRow() {
  const other = locale === 'ar' ? 'en' : 'ar';
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirm = () => {
    setBusy(true);
    void setLocale(other).finally(() => setBusy(false));
  };
  return (
    <Section title={t.language.label}>
      <View style={{ marginHorizontal: -16 }}>
        <ListRow title={t.language[other]} onPress={() => setAsking(true)} />
      </View>
      {asking ? (
        <InlineConfirm
          message={t.language.restart}
          onConfirm={confirm}
          onCancel={() => setAsking(false)}
          busy={busy}
        />
      ) : null}
    </Section>
  );
}

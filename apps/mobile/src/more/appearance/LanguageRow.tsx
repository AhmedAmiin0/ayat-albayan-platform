import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { setLocale } from '@/core/lib/i18n/locale-switch';
import { ErrorLine } from '@/inbox/ErrorLine';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Section } from '../Section';
import { InsetGroup } from '@/core/ui/surface/inset';

/**
 * «اللغة»: offers the other language by its own name (العربية / English). Every screen reads its
 * strings once, at start, so switching restarts the app: one short confirm first. If the restart
 * itself fails, it says to reopen the app (the choice is saved and applies then).
 */
export function LanguageRow() {
  const other = locale === 'ar' ? 'en' : 'ar';
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const confirm = () => {
    setBusy(true);
    void setLocale(other).then((r) => {
      setBusy(false);
      setNote(r === 'restart' ? t.language.restartManually : r === 'error' ? t.common.error : null);
    });
  };
  return (
    <Section title={t.language.label}>
      <InsetGroup>
        <ListRow title={t.language[other]} onPress={() => setAsking(true)} />
      </InsetGroup>
      {asking ? (
        <InlineConfirm
          message={t.language.restart}
          onConfirm={confirm}
          onCancel={() => setAsking(false)}
          busy={busy}
        />
      ) : null}
      {note ? <ErrorLine message={note} /> : null}
    </Section>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Toast } from '@/components/ui/toast';
import { SalesAutoAssignSwitch } from '@/features/sales/SalesAutoAssignSwitch';
import { TemplateHealth } from '@/features/templates/TemplateHealth';
import { t } from '@/lib/i18n';
import { settingsQuery } from './api';
import { AutoMessagesSwitch } from './AutoMessagesSwitch';
import { MessagingSwitch } from './MessagingSwitch';
import { SettingsForm } from './SettingsForm';

const h2 = 'mb-3 font-display text-h4 font-bold';

/**
 * /admin/settings: the messaging kill switch (with the CRM warning) and the automatic-messages
 * switch next to it, WhatsApp template health (R-MSG-01) and every academy setting (late cancel,
 * horizon, alert thresholds, payouts, reminders).
 */
export function SettingsPage() {
  const settings = useQuery(settingsQuery);
  const [saved, setSaved] = useState(false);
  const ids = { sending: useId(), templates: useId(), academy: useId() };

  return (
    <>
      <PageHead>
        <Cartouche>{t.settings.title}</Cartouche>
      </PageHead>
      {settings.isError && <FormAlert>{t.common.error}</FormAlert>}
      {settings.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      <div className="grid gap-10">
        {settings.data && (
          <section aria-labelledby={ids.sending}>
            <h2 id={ids.sending} className={h2}>
              {t.templates.settings.title}
            </h2>
            <div className="grid gap-4">
              <MessagingSwitch settings={settings.data} />
              <AutoMessagesSwitch settings={settings.data} />
              <SalesAutoAssignSwitch settings={settings.data} />
            </div>
          </section>
        )}
        <section aria-labelledby={ids.templates}>
          <TemplateHealth headingId={ids.templates} />
        </section>
        {settings.data && (
          <section aria-labelledby={ids.academy}>
            <h2 id={ids.academy} className={h2}>
              {t.settings.academy}
            </h2>
            <SettingsForm settings={settings.data} onSaved={() => setSaved(true)} />
          </section>
        )}
      </div>
      {saved && <Toast message={t.settings.saved} onDismiss={() => setSaved(false)} />}
    </>
  );
}

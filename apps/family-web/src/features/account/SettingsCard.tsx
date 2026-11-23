import { LanguageSwitch } from '@ab/web-kit/shell';
import { ThemeToggle } from '@ab/web-kit/layout';
import { Card, SectionHeader } from '@ab/web-kit/surface';
import { t } from '@ab/web-kit/i18n';
import { WebPushToggle } from '@ab/web-kit/push';

/** «الإعدادات»: this browser's notifications, then the theme and the language. */
export function SettingsCard() {
  return (
    <Card asChild>
      <section aria-labelledby="account-settings" className="grid gap-2 pt-2">
        <SectionHeader
          id="account-settings"
          title={t.portal.app.account.settings}
          className="px-4"
        />
        <WebPushToggle />
        <div className="flex flex-wrap items-center gap-2 border-t border-rule px-4 py-3">
          <ThemeToggle />
          <LanguageSwitch />
        </div>
      </section>
    </Card>
  );
}

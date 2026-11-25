import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { ThemeToggle } from '@ab/web-kit/components/ui/layout/theme-toggle';
import { Card } from '@ab/web-kit/components/ui/surface/card';
import { SectionHeader } from '@ab/web-kit/components/ui/surface/section-header';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { WebPushToggle } from '@ab/web-kit/push/WebPushToggle';

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

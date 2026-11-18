import type { PortalHome } from '@ab/shared';
import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { ThemeToggle } from '@ab/web-kit/components/ui/layout/theme-toggle';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { WebPushToggle } from '@ab/web-kit/push/WebPushToggle';
import { useSignOut } from './use-sign-out';

/** Who signed in: «ولي أمر» with the children, or the student with their code. */
function Who({ home }: { home: PortalHome }) {
  const own = home.kind === 'student' ? home.students[0] : undefined;
  if (own) {
    return (
      <div className="grid gap-0.5">
        <p className="font-display text-h3 font-bold">{own.name}</p>
        <p className="text-sm text-ink-2">{t.portal.app.account.student.replace('{code}', own.code)}</p>
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      <p className="font-display text-h3 font-bold">{t.portal.app.account.guardian}</p>
      <h2 className="text-sm font-semibold text-ink-2">{t.portal.app.account.children}</h2>
      <ul className="grid gap-1 text-sm">
        {home.students.map((s) => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ul>
    </div>
  );
}

/** «حسابي»: who is in, this browser's notifications, theme and language, «تسجيل الخروج». */
export function AccountPage({ home }: { home: PortalHome }) {
  const out = useSignOut();
  return (
    <section aria-labelledby="account-title" className="grid gap-5">
      <h1 id="account-title" className="font-display text-h2 font-bold">
        {t.portal.app.tabs.account}
      </h1>
      <div className="rounded-lg border border-rule bg-raised p-4">
        <Who home={home} />
      </div>
      <section aria-label={t.portal.app.account.settings} className="grid gap-2 rounded-lg border
        border-rule bg-raised">
        <WebPushToggle />
        <div className="flex flex-wrap items-center gap-2 border-t border-rule px-4 py-3">
          <ThemeToggle />
          <LanguageSwitch />
        </div>
      </section>
      <Button
        type="button"
        variant="secondary"
        className="justify-self-start"
        disabled={out.isPending}
        onClick={() => out.mutate()}
      >
        {t.auth.logout}
      </Button>
    </section>
  );
}

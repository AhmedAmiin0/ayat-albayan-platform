import { t } from '@ab/web-kit';

/** Families no longer sign in on the staff app once the family host is live (docs/51 §3). */
export function FamilyHostLink({ host }: { host: string }) {
  return (
    <p className="grid gap-1 border-t border-rule pt-4 text-xs text-pretty text-ink-3">
      <span>{t.familyWeb.loginLinkHint}</span>
      <a href={`${host}/login`} className="font-semibold text-act underline-offset-4 hover:underline">
        {t.familyWeb.loginLink}
      </a>
    </p>
  );
}

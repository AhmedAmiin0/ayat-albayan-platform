import { t } from '@ab/web-kit/lib/i18n/i18n';

/** «أو» between two cream hairlines (boards: between a sign-in way and the other one). */
export function OrDivider() {
  return (
    <p className="flex items-center gap-3 text-xs font-semibold text-ink-3">
      <span aria-hidden="true" className="h-px flex-1 bg-rule" />
      {t.familyLook.signIn.or}
      <span aria-hidden="true" className="h-px flex-1 bg-rule" />
    </p>
  );
}

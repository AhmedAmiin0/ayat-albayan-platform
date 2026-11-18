import { Mark } from '@ab/web-kit/components/ui/display/mark';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const S = t.familyApp.signIn;

/**
 * The top of the family sign-in, as the family app (docs/50 §5, #748): the academy emblem
 * (docs/design/brand/logo-mark.png, the kit Mark) on the deep-green tile in both themes, the
 * wordmark «Ayat Al-Bayan» over «آيات البيان», and one line of welcome.
 */
export function SignInLockup() {
  return (
    <header className="grid justify-items-center gap-3 text-center">
      <span className="grid size-[76px] place-items-center rounded-[17px] bg-brand-tile">
        <Mark size={59} />
      </span>
      <div className="grid">
        <h1 lang="en" dir="ltr" className="font-display text-h2 font-bold">
          {S.wordmark}
        </h1>
        <p lang="ar" dir="rtl" className="font-display text-h4 text-ink-2">
          {S.wordmarkArabic}
        </p>
      </div>
      <p className="text-body text-pretty text-ink-2">{S.welcome}</p>
    </header>
  );
}

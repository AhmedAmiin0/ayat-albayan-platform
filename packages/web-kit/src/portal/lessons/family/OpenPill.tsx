import { t } from '@ab/web-kit/lib/i18n/i18n';

/** «الدخول متاح الآن» on the emerald card: a soft white pill with a glowing green dot. */
export function OpenPill() {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-full
      bg-white/15 px-3 text-[13px] font-bold text-white">
      <span aria-hidden="true" className="size-2 rounded-full bg-[#4ade80]
        shadow-[0_0_0_3px_rgba(74,222,128,0.25)]" />
      {t.portal.app.lesson.openNow}
    </span>
  );
}

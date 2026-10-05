import { academyWhatsappUrl } from '@ab/shared';
import { t } from '@/lib/i18n';
import { usePublicConfig } from '@/lib/public-config';

type Kind = 'sent' | 'already' | 'expired' | 'invalid';

const TITLE: Record<Kind, string> = {
  sent: t.feedback.thanksTitle,
  already: t.feedback.alreadySent,
  expired: t.feedback.expired,
  invalid: t.feedback.invalid,
};
const BODY: Partial<Record<Kind, string>> = {
  sent: t.feedback.thanksBody,
  expired: t.feedback.expiredBody,
  invalid: t.feedback.invalidBody,
};

/**
 * The closing screens of the public page: sent, already sent, and a link that is expired (410) or
 * not valid (404). A dead link names the way out: the academy's WhatsApp.
 */
export function ThankYou({ kind }: { kind: Kind }) {
  const body = BODY[kind];
  const whatsapp = academyWhatsappUrl(usePublicConfig());
  const dead = kind === 'expired' || kind === 'invalid';
  return (
    <div role="status" className="grid justify-items-center gap-2.5 px-2 py-8 text-center">
      <svg viewBox="0 0 56 56" aria-hidden="true" className="size-14 text-gold">
        <path d="M28 4 52 28 28 52 4 28Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M28 11 45 28 28 45 11 28Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 3" />
      </svg>
      <h2 className="font-display text-h3 font-bold text-pretty">{TITLE[kind]}</h2>
      {body && <p className="max-w-[36ch] text-sm text-pretty text-ink-2">{body}</p>}
      {dead && (
        <a href={whatsapp} className="min-h-11 content-center text-sm font-semibold text-lapis underline underline-offset-4">
          {t.feedback.openWhatsapp}
        </a>
      )}
    </div>
  );
}

import { t } from '@/lib/i18n';

/** The closing screens of the public page: sent, already sent, and a link that is wrong or expired. */
export function ThankYou({ kind }: { kind: 'sent' | 'already' | 'invalid' }) {
  const title = kind === 'invalid' ? t.feedback.expired : kind === 'already' ? t.feedback.alreadySent : t.feedback.thanksTitle;
  return (
    <div role="status" className="grid justify-items-center gap-2.5 px-2 py-8 text-center">
      <svg viewBox="0 0 56 56" aria-hidden="true" className="size-14 text-gold">
        <path d="M28 4 52 28 28 52 4 28Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M28 11 45 28 28 45 11 28Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 3" />
      </svg>
      <h2 className="font-display text-h3 font-bold text-pretty">{title}</h2>
      {kind === 'sent' && <p className="max-w-[36ch] text-sm text-pretty text-ink-2">{t.feedback.thanksBody}</p>}
    </div>
  );
}

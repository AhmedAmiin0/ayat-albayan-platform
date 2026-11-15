import { buttonVariants } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';

/** The teacher's fixed meeting link (R-LES-01/02, issue B8): the same link every lesson. */
export function JoinLink({ link }: { link: string | null }) {
  return (
    <section aria-label={t.teacherDash.joinLink} className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-sunk px-4 py-3">
      <h2 className="text-sm font-semibold">{t.teacherDash.joinLink}</h2>
      {link ? (
        <>
          <Ltr className="min-w-0 truncate text-sm text-ink-2">{link.replace(/^https?:\/\//, '')}</Ltr>
          <a href={link} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'ms-auto' })}>
            {t.teacherDash.join}
          </a>
        </>
      ) : (
        <p className="text-sm text-ink-2">{t.teacherDash.noLink}</p>
      )}
    </section>
  );
}

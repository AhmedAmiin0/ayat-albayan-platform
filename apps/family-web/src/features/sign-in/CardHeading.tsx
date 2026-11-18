import { useId, type ReactNode } from 'react';
import { SectionHeading } from '@ab/web-kit/family/layout/SectionHeading';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/**
 * The top of the sign-in card (boards PortalWebSignIn*): the mint «لأولياء الأمور والطلاب», the
 * step's title as the page's h1 («تسجيل الدخول» / «أدخل الرمز»), the ◆ rule, then its line.
 */
export function CardHeading({ title, children }: { title: string; children?: ReactNode }) {
  const id = useId();
  return (
    <div className="grid gap-2.5 sm:[&_h1]:text-[32px]">
      <SectionHeading id={id} level={1} title={title} label={t.familyLook.signIn.audience} />
      {children && <p className="text-body leading-[1.7] text-pretty text-ink-3">{children}</p>}
    </div>
  );
}

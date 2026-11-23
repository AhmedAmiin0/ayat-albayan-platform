import { roleKey, type PersonLook } from '@ab/client-core';
import { formatPhone } from '@ab/core';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';

// Who a link's user or visitor is (board LinkXWebDetail): a system user by name and role, a
// verified phone with the person it matched, or «رقم غير مسجّل».

/** The small boxed role word: «ولي الأمر», «المبيعات»… */
export function RoleTag({ role }: { role: string }) {
  return (
    <span className="rounded-sm border border-rule px-1.5 text-[11px] leading-5 text-ink-2">
      {t.activity.roles[roleKey(role)]}
    </span>
  );
}

function NameAndRole({ look }: { look: PersonLook }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span>{look.name}</span>
      {look.role && <RoleTag role={look.role} />}
    </span>
  );
}

/** A phone's second line: the matched person, or «رقم غير مسجّل». */
function PhoneSub({ look }: { look: PersonLook }) {
  return look.unregistered ? (
    <span className="text-xs text-ink-3">{t.shortLinks.form.unregistered}</span>
  ) : (
    <span className="text-xs text-ink-3"><NameAndRole look={look} /></span>
  );
}

export function PersonLine({ look }: { look: PersonLook }) {
  return look.phone === null ? (
    <span className="font-semibold"><NameAndRole look={look} /></span>
  ) : (
    <span className="grid gap-0.5">
      <Ltr className="font-semibold">{formatPhone(look.phone)}</Ltr>
      <PhoneSub look={look} />
    </span>
  );
}

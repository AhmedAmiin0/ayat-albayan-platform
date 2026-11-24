import { formatPhone } from '@ab/core';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const S = t.familyApp.signIn;

/**
 * Over the code boxes, as the family app: «أدخل الرمز» and the number the code went to, written
 * as an LTR island inside the line (a spaced number is more than isolateLtr's «+digits»).
 */
export function CodeNote({ phone }: { phone: string }) {
  const [before = '', after = ''] = S.codeSentTo.split('{phone}');
  return (
    <div className="grid gap-1.5">
      <h2 className="font-display text-h4 font-bold">{S.codeTitle}</h2>
      <p className="text-sm text-pretty text-ink-2">
        {before}
        <Ltr>{formatPhone(phone)}</Ltr>
        {after}
      </p>
    </div>
  );
}

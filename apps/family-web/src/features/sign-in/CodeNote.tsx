import { formatPhone } from '@ab/shared';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CardHeading } from './CardHeading';

const S = t.familyApp.signIn;

/**
 * Over the code boxes, as the family app: the card's «أدخل الرمز» and the number the code went
 * to, as an LTR island inside the line (a spaced number is more than isolateLtr's «+digits»).
 */
export function CodeNote({ phone }: { phone: string }) {
  const [before = '', after = ''] = S.codeSentTo.split('{phone}');
  return (
    <CardHeading title={S.codeTitle}>
      {before}
      <Ltr>{formatPhone(phone)}</Ltr>
      {after}
    </CardHeading>
  );
}

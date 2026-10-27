import { formatPhone } from '@ab/shared';
import { type, useTheme } from '@/theme';
import { Ltr } from '../primitives/Ltr';

/** A guardian's E.164 phone, readable («+966 55 111 0000»): LTR island, tabular, xs ink-2, never cut. */
export function PhoneText({ phone }: { phone: string }) {
  const { color } = useTheme();
  return (
    <Ltr
      numberOfLines={undefined}
      style={{ fontFamily: type.ui[500], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 }}
    >
      {formatPhone(phone)}
    </Ltr>
  );
}

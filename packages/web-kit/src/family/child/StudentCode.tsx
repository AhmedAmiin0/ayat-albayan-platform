import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/**
 * «رقم الطالب: AB-2041» (t.portal.code), the code an LTR island in Poppins so it never flips.
 * `bare`: the code alone (a card's meta line).
 */
export function StudentCode({ code, bare = false }: { code: string; bare?: boolean }) {
  const [before = '', after = ''] = t.portal.code.split('{code}');
  const island = <Ltr className="font-latin tracking-[0.2px]">{code}</Ltr>;
  if (bare) return island;
  return (
    <span className="whitespace-nowrap">
      {before}
      {island}
      {after}
    </span>
  );
}

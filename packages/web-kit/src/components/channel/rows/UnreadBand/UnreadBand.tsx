import { t } from '@ab/web-kit/lib/i18n/i18n';

/** It stays where it was while the reader reads on. */
export function UnreadBand({ count }: { count: number }) {
  return (
    <li
      className="border-y border-lapis/25 bg-accent py-1 text-center text-2xs font-bold text-lapis"
    >
      {t.studentChannel.unread.replace('{n}', String(count))}
    </li>
  );
}

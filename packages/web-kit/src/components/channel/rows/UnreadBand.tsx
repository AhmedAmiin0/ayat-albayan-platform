import { t } from '#/lib/i18n/index.ts';

/**
 * «4 غير مقروءة» over the first message unread when the chat opened (FamChatWebThread): edge to
 * edge on the brand wash; it stays where it was while the reader reads on.
 */
export function UnreadBand({ count }: { count: number }) {
  return (
    <li
      className="border-y border-lapis/25 bg-accent py-1 text-center text-2xs font-bold text-lapis"
    >
      {t.studentChannel.unread.replace('{n}', String(count))}
    </li>
  );
}

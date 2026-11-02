import { cn } from '@/lib/utils';

interface Props {
  online: boolean;
  /** «متصل الآن» / «آخر ظهور …» / «آخر رسالة …»; '' shows nothing. */
  text: string;
  className?: string;
}

/** One quiet line: a small success-toned dot when online, then the text. */
export function PresenceStatus({ online, text, className }: Props) {
  if (!text) return null;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-2xs text-ink-3', className)}>
      {online && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-ok" />}
      <span className={cn('truncate', online && 'font-semibold text-ok')}>{text}</span>
    </span>
  );
}

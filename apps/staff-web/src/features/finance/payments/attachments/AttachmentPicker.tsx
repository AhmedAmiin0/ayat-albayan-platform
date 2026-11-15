import { RECEIPT_MIMES } from '@ab/shared';
import { useId } from 'react';
import { buttonVariants } from '@/components/ui/form/button';
import { cn } from '@/lib/utils';

type Props = { label: string; onPick: (files: File[]) => void; invalid?: boolean };

/** «أضف مرفقًا»: a native multi-file input (kept for keyboard and screen readers, its chrome hidden). */
export function AttachmentPicker({ label, onPick, invalid }: Props) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        buttonVariants({ variant: 'secondary', size: 'sm' }),
        'justify-self-start has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-(--lapis)',
      )}
    >
      {label}
      <input
        id={id}
        type="file"
        multiple
        accept={RECEIPT_MIMES.join(',')}
        aria-invalid={invalid ? true : undefined}
        className="sr-only"
        onChange={(e) => {
          onPick(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </label>
  );
}

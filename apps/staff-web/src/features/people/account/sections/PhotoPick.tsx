import { useId, type ChangeEvent, type Ref } from 'react';
import { buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { cn } from '@ab/web-kit/lib/utils';
import { AVATAR_ACCEPT } from '@/features/people/account/avatar-file';

export interface PhotoPickProps {
  label: string;
  disabled: boolean;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  /** The file input (the focusable part), e.g. to return focus to it. */
  inputRef?: Ref<HTMLInputElement>;
}

export function PhotoPick({ label, disabled, onPick, inputRef }: PhotoPickProps) {
  const inputId = useId();
  return (
    <>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={AVATAR_ACCEPT}
        className="peer sr-only"
        disabled={disabled}
        onChange={onPick}
      />
      <label
        htmlFor={inputId}
        className={cn(
          buttonVariants({ variant: 'secondary' }),
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-45',
        )}
      >
        {label}
      </label>
    </>
  );
}

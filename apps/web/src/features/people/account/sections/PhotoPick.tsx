import { useId, type ChangeEvent } from 'react';
import { buttonVariants } from '@/components/ui/form/button';
import { cn } from '@/lib/utils';
import { AVATAR_ACCEPT } from '../avatar-file';

export interface PhotoPickProps {
  /** The button's text («اختيار صورة», «تغيير الصورة»). */
  label: string;
  disabled: boolean;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * A photo picker drawn as a secondary button: the label of a visually hidden JPG/PNG/WebP file
 * input, showing the input's focus ring (peer-focus-visible). «حسابي» and the admin's staff photo.
 */
export function PhotoPick({ label, disabled, onPick }: PhotoPickProps) {
  const inputId = useId();
  return (
    <>
      <input
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

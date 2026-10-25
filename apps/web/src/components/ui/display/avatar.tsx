import { initialsOf } from '@ab/shared';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './icon';

export interface AvatarProps {
  /** Whose photo: gives the initials fallback and, with `alt`, the image text. */
  name: string;
  /** A signed photo URL or a local preview; null/undefined shows the initials. */
  src?: string | null;
  /** The image's text; omitted = decorative (the name is already beside it). */
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  // Amiri only from 20px (docs/07 §2): the 32px chip sets its initials in Plex.
  sm: 'size-8 text-xs font-sans',
  md: 'size-10 text-[20px] font-display',
  lg: 'size-24 text-[34px] font-display',
} as const;

/**
 * A person's photo in a round frame (docs/07 §4: rounded-full for avatars), or their initials on
 * the gold-wash tile with a gold hairline (the inbox/lead avatar). A photo that fails to load falls
 * back to the initials; no name falls back to the person glyph.
 */
export function Avatar({ name, src, alt, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const frame = cn('relative grid shrink-0 place-items-center overflow-hidden rounded-full', SIZES[size], className);
  if (src && failed !== src) {
    return (
      <span className={cn(frame, 'bg-sunk shadow-[inset_0_0_0_1px_var(--rule-strong)]')}>
        <img src={src} alt={alt ?? ''} onError={() => setFailed(src)} className="size-full object-cover" />
      </span>
    );
  }
  const initials = initialsOf(name);
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
      className={cn(frame, 'bg-gold-wash leading-none font-bold text-ink shadow-[inset_0_0_0_1px_var(--gold)]')}
    >
      {initials || <Icon name="teacher" className="size-[55%] text-ink-2" />}
    </span>
  );
}

import { avatarInitials, avatarTone } from '@ab/shared';
import { memo, useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { Icon } from './icon';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /** Whose circle: the initials, the accessible name and (without `id`) the tone seed. */
  name: string;
  /** The person's id: seeds the tone, so a person keeps one colour on every screen. */
  id?: string | null;
  /** A signed photo URL or a local preview; null/undefined (or a failed load) shows the initials. */
  src?: string | null;
  /** Overrides the accessible name (e.g. «معاينة الصورة الجديدة»). */
  alt?: string;
  /** The name is already beside it: hidden from assistive tech. */
  decorative?: boolean;
  /** 28 / 36 / 64 px; `xl` (96 px) is for the call screens and the «حسابي» photo. */
  size?: AvatarSize;
  className?: string;
}

const SIZES: Record<AvatarSize, string> = {
  // Amiri only from 20px (docs/07 §2): the small circles set their initials in Plex.
  sm: 'size-7 text-xs font-sans',
  md: 'size-9 text-[15px] font-sans',
  lg: 'size-16 text-[26px] font-display',
  xl: 'size-24 text-[34px] font-display',
};

const FRAME = 'relative grid shrink-0 place-items-center overflow-hidden rounded-full shadow-[inset_0_0_0_1px_var(--rule-strong)]';

/** The circle's accessible name: none when decorative, else `alt`, else the name ('' = none). */
const labelOf = ({ name, alt, decorative }: AvatarProps): string => (decorative ? '' : (alt ?? name));

/** The initials on the person's tone (`var(--avatar-1…6)`, styles/avatar-tones.css), or the glyph. */
function Initials({ props, frame }: { props: AvatarProps; frame: string }) {
  const seed = props.id || props.name;
  const tone = avatarTone(seed) + 1;
  const label = labelOf(props);
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      data-avatar-tone={tone}
      style={{ backgroundColor: `var(--avatar-${tone})` }}
      className={cn(frame, 'leading-none font-bold text-ink')}
    >
      {avatarInitials(props.name) || <Icon name="teacher" className="size-[55%] text-ink-2" />}
    </span>
  );
}

/**
 * A person's photo in a round frame (docs/07 §4), or one consistent initials circle (owner
 * 2026-10-28): the name's initials (avatarInitials) in `ink` on the person's tone, a hairline
 * around both. A photo that fails to load falls back to the initials; no letter shows the person
 * glyph. Fixed size and shrink-0, so a loading photo never moves the row. Students, guardians and
 * WhatsApp contacts never get `src`.
 */
function AvatarBase(props: AvatarProps) {
  const { src, size = 'md', className } = props;
  const [failed, setFailed] = useState<string | null>(null);
  const frame = cn(FRAME, SIZES[size], className);
  if (!src || failed === src) return <Initials props={props} frame={frame} />;
  const label = labelOf(props) && (props.alt ?? t.staffPhoto.photoOf.replace('{name}', props.name));
  return (
    <span className={cn(frame, 'bg-sunk')} aria-hidden={label ? undefined : true}>
      <img src={src} alt={label} onError={() => setFailed(src)} className="size-full rounded-full object-cover" />
    </span>
  );
}

/** Memoised: list rows re-render often and the props are plain values. */
export const Avatar = memo(AvatarBase);

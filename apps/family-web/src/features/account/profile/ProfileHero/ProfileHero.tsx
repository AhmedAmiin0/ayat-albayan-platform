import { Avatar, Card } from '@ab/web-kit';
import type { Props } from './ProfileHero.types';

/** The profile's head: the photo or initials in a gold ring, the name, who signed in. */
export function ProfileHero({ name, line, photo, seed }: Props) {
  return (
    <Card className="grid justify-items-center gap-2 px-4 py-6 text-center">
      <span className="rounded-full p-1 ring-2 ring-gold-soft">
        <Avatar name={name} id={seed} src={photo} size="xl" decorative />
      </span>
      <h2 className="font-display text-h3 font-bold">{name}</h2>
      <p className="text-sm text-ink-2">{line}</p>
    </Card>
  );
}

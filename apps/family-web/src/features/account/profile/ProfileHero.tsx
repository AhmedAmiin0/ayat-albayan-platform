import { Avatar, Card } from '@ab/web-kit';

interface Props {
  name: string;
  line: string;
  /** The signed photo URL, else null (the initials). */
  photo: string | null;
  /** A student's id, so their initials keep the tone of their home; else the name. */
  seed: string | null;
}

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

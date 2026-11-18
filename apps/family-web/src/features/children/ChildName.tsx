import { t } from '@ab/web-kit/lib/i18n/i18n';

interface Props {
  id: string;
  name: string;
  /** «أهلًا بك، يوسف» on a student's own home, the name in gold. */
  own: boolean;
}

/** The page's h1 on the hero: the child's name, or the greeting with it. */
export function ChildName({ id, name, own }: Props) {
  const [before = '', after = ''] = own ? t.familyLook.child.greeting.split('{name}') : [];
  return (
    <h1 id={id} className="text-[30px] font-extrabold leading-snug text-white sm:text-[38px]">
      {before}
      <span className={own ? 'text-fam-gold' : undefined}>{name}</span>
      {after}
    </h1>
  );
}

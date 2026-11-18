import type { ReactNode } from 'react';
import { DiamondRule } from '@ab/web-kit/family/ornament/Diamond';

interface Props {
  id: string;
  title: ReactNode;
  /** The mint pill above the title («الأيام الأربعة عشر القادمة»). */
  label?: ReactNode;
  /** h2 (default) or h1 for a page without a hero title. */
  level?: 1 | 2;
}

/** A section's heading (boards): the mint label pill, the green-gradient title, the ◆ rule. */
export function SectionHeading({ id, title, label, level = 2 }: Props) {
  const Tag = level === 1 ? 'h1' : 'h2';
  return (
    <div className="grid justify-items-start gap-2.5 text-start">
      {label && (
        <span className="inline-flex min-h-[30px] items-center rounded-full border
          border-fam-mint-rule bg-fam-mint px-3.5 text-xs font-bold text-fam-mint-ink">
          {label}
        </span>
      )}
      <Tag id={id} className="bg-[image:var(--fam-title)] bg-clip-text text-[24px] font-extrabold
        leading-snug text-transparent sm:text-[28px]">
        {title}
      </Tag>
      <DiamondRule />
    </div>
  );
}

import type { ViewerPage } from '@ab/client-core';
import type { PortalLessonFile } from '@ab/shared';
import { Icon } from '#/components/ui/display/index.ts';
import { IconButton } from '#/components/ui/form/index.ts';
import { t } from '#/lib/i18n/index.ts';

const V = t.familyFiles;

interface Props {
  page: ViewerPage<PortalLessonFile>;
  onGo: (file: PortalLessonFile) => void;
}

/** «‹ 1 من 2 ›»: the lesson's other pictures and PDFs, one step each way (none past the ends). */
export function ViewerPager({ page, onGo }: Props) {
  const { prev, next } = page;
  const count = V.pageOf.replace('{n}', String(page.number)).replace('{total}', String(page.total));
  return (
    <nav aria-label={t.lessonFiles.title} className="flex items-center justify-center gap-2">
      <IconButton label={V.prevFile} disabled={!prev} onClick={() => prev && onGo(prev)}>
        <Icon name="chevron-right" />
      </IconButton>
      <span className="text-sm font-semibold tabular-nums">{count}</span>
      <IconButton label={V.nextFile} disabled={!next} onClick={() => next && onGo(next)}>
        <Icon name="chevron-left" />
      </IconButton>
    </nav>
  );
}

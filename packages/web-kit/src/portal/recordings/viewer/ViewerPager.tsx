import type { ViewerPage } from '@ab/client-core';
import type { PortalLessonFile } from '@ab/shared';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { IconButton } from '@ab/web-kit/components/ui/form/icon-button';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const V = t.familyFiles;

interface Props {
  page: ViewerPage<PortalLessonFile>;
  onGo: (file: PortalLessonFile) => void;
}

/** One step each way, none past the ends. */
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

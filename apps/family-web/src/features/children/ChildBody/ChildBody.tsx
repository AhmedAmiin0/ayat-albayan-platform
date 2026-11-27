import { Tabs, t } from '@ab/web-kit';
import { ChildPanel } from '@ab/web-kit/room';
import type { Props } from './ChildBody.types';
import { PREFIX, END_GAP } from './child-body.helpers';
import { useChildBody } from './use-child-body';

/** docs/50 §6: package tab only for a viewer who sees money; only the shown panel mounts. */
export function ChildBody({ student, kind, tab, onTab, exceptNext }: Props) {
  const { tabs, shown, ids, open, openLesson } = useChildBody({ student, kind, tab });
  return (
    <div className="grid gap-4">
      <Tabs
        label={t.portal.childTabs}
        tabs={tabs}
        value={shown}
        onChange={onTab}
        idPrefix={PREFIX}
        followSelected
      />
      <div
        key={shown}
        role="tabpanel"
        id={ids.panel}
        aria-labelledby={ids.tab}
        className={`animate-fade-up ${END_GAP}`}
      >
        <ChildPanel
          tab={shown}
          student={student}
          onOpenReport={open}
          onOpenLesson={openLesson}
          exceptNext={exceptNext}
        />
      </div>
    </div>
  );
}

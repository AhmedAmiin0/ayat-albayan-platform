import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { StudentsSwitchProps } from './StudentsSwitch.types';

export function StudentsSwitch({ board }: StudentsSwitchProps) {
  return (
    <label className="flex min-h-11 items-center gap-2 px-1 text-sm">
      <input
        type="checkbox"
        checked={board.state.studentsCanDraw}
        onChange={(e) => board.setStudentsCanDraw(e.target.checked)}
        className="size-4 accent-[var(--lapis)]"
      />
      {t.classroom.board.allowStudents}
    </label>
  );
}

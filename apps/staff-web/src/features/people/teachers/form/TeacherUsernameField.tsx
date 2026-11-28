import { tidyUsername } from '@ab/client-core';
import { Field, Input, t } from '@ab/web-kit';
import type { Teacher } from '@ab/shared';

interface Props {
  teacher: Teacher;
  value: string;
  onChange: (value: string) => void;
}

/** Without a login (profile_id null) it is disabled (docs/30 §7). */
export function TeacherUsernameField({ teacher, value, onChange }: Props) {
  const T = t.familyAuth.teacherUsername;
  const hasLogin = !!teacher.profile_id;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={T.label} hint={hasLogin ? T.hint : T.needsLogin}>
        {(p) => (
          <Input
            {...p}
            dir="ltr"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            disabled={!hasLogin}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => onChange(tidyUsername(value))}
          />
        )}
      </Field>
    </div>
  );
}

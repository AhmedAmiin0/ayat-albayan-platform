import { tidyUsername } from '@ab/client-core';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import type { Teacher } from '../api';

type Props = { teacher: Teacher; value: string; onChange: (value: string) => void };

/**
 * «اسم المستخدم» of the teacher's login (docs/30 §7): an LTR island, lower-cased on blur. Without a login
 * (profile_id null) it is disabled with the note to create the login on «المستخدمون» first.
 */
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

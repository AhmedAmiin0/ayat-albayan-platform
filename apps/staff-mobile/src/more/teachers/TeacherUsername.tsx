import { tidyUsername, usernameApiError, usernameChange } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions, apiSend, t, Field, AppText, Button, type, useTheme } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import type { Teacher } from '@ab/shared';

/** docs/30 §7: needs teachers.write; lower-cased, sent only when changed, empty clears it. */
export function TeacherUsername({ teacher }: { teacher: Teacher }) {
  const T = t.familyAuth.teacherUsername;
  const { color } = useTheme();
  const canWrite = usePermissions()('teachers.write');
  const queryClient = useQueryClient();
  const [value, setValue] = useState(teacher.username ?? '');
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (body: { username?: string | null }) => apiSend<Teacher>('PATCH', `/teachers/${teacher.id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ predicate: (q) => ['teachers', 'users'].includes(String(q.queryKey[0])) }),
    onError: (e) => setError(usernameApiError(e, T) ?? t.common.error),
  });
  if (!canWrite) return null;
  const hasLogin = !!teacher.profile_id;
  const submit = () => {
    setValue(tidyUsername(value));
    const change = usernameChange(teacher.username, value, T);
    setError(change.ok ? null : change.error);
    if (change.ok && change.body.username !== undefined) save.mutate(change.body);
  };
  return (
    <View style={{ gap: 8 }}>
      <Field
        label={T.label}
        ltr
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        editable={hasLogin}
        value={value}
        onChangeText={setValue}
        onBlur={() => setValue(tidyUsername(value))}
      />
      <Note>{hasLogin ? T.hint : T.needsLogin}</Note>
      {error ? (
        <AppText accessibilityRole="alert" style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.bad }}>
          {error}
        </AppText>
      ) : null}
      {hasLogin ? <Button variant="secondary" label={t.common.save} busy={save.isPending} onPress={submit} /> : null}
    </View>
  );
}

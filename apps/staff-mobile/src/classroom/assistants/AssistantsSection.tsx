import type { AssistantView } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  usePermissions,
  pathKey,
  t,
  Button,
  ListRow,
  InsetGroup,
  ErrorLine,
  Section,
} from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { assignAssistant, removeAssistant, useAllAssistants, useStudentAssistants } from './assistants-api';
import { AssistantPicker } from './AssistantPicker';

const A = t.classroom.assistants;

/** The assistants not yet on the student: what the picker offers. */
export const freeAssistants = (all: readonly AssistantView[], mine: readonly AssistantView[]): AssistantView[] =>
  all.filter((a) => !mine.some((m) => m.profile_id === a.profile_id));

/** A failed read with nothing cached leaves the section out so the profile stays quiet. */
export function AssistantsSection({ studentId }: { studentId: string }) {
  const can = usePermissions();
  const client = useQueryClient();
  const mine = useStudentAssistants(studentId, can('assistants.read'));
  const all = useAllAssistants(can('assistants.write'));
  const refresh = () => client.invalidateQueries({ queryKey: pathKey(`/students/${studentId}/assistants`) });
  const add = useMutation({ mutationFn: assignAssistant, onSuccess: refresh });
  const remove = useMutation({ mutationFn: removeAssistant, onSuccess: refresh });
  if (!can('assistants.read') || (mine.isError && !mine.data)) return null;
  const write = can('assistants.write');
  const list = mine.data ?? [];
  return (
    <Section title={A.title}>
      {mine.isPending ? <Note>{t.common.loading}</Note> : null}
      {mine.isSuccess && list.length === 0 ? <Note>{A.none}</Note> : null}
      <InsetGroup>
        {list.map((a) => (
          <ListRow
            key={a.profile_id}
            title={a.full_name}
            trailing={write ? <Button variant="danger" label={A.remove} accessibilityLabel={`${A.remove} ${a.full_name}`} disabled={remove.isPending} onPress={() => remove.mutate({ studentId, profileId: a.profile_id })} /> : undefined}
          />
        ))}
      </InsetGroup>
      {write && all.isSuccess ? (
        <AssistantPicker free={freeAssistants(all.data, list)} onPick={(profileId) => add.mutate({ studentId, profileId })} />
      ) : null}
      {add.isError || remove.isError ? <ErrorLine message={t.common.error} /> : null}
    </Section>
  );
}

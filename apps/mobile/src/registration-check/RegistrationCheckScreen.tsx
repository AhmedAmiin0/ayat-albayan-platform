import { formatPhone } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { inTree, useTreeBase } from '@/nav/tree-base';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { type CheckBy, type CheckSearch, checkErrorText, searchOf, useRegistrationCheck } from './registration-check';
import { RegistrationForm } from './RegistrationForm';
import { RegistrationResults } from './RegistrationResults';

/** The chat's number (from the thread header), checked at once. */
type Params = { phone?: string };

/**
 * /…/registration-check[?phone=…] (owner 2026-10-12, docs/16 row 23), from the sales chat header
 * (the thread's number filled in and checked) and the «الطلاب» header: is this family or child
 * already registered? Name, code, status and teacher only. Needs students.check_registration.
 */
export function RegistrationCheckScreen() {
  const params = useLocalSearchParams<Params>();
  const first = searchOf('phone', params.phone ?? '');
  const can = usePermissions();
  const base = useTreeBase();
  const [by, setBy] = useState<CheckBy>(params.phone ? 'phone' : 'name');
  const [text, setText] = useState({ phone: params.phone ? formatPhone(params.phone) : '', name: '' });
  const [search, setSearch] = useState<CheckSearch | null>('search' in first ? first.search : null);
  const [invalid, setInvalid] = useState<string>();
  const check = useRegistrationCheck(search);
  const back = () => (router.canGoBack() ? router.back() : router.replace(inTree(base, '/inbox')));

  const submit = () => {
    const next = searchOf(by, text[by]);
    if ('error' in next) {
      setInvalid(t.registrationCheck.error[next.error]);
      return setSearch(null);
    }
    setInvalid(undefined);
    if (JSON.stringify(next.search) === JSON.stringify(search)) void check.refetch();
    else setSearch(next.search);
  };
  const pick = (mode: CheckBy) => {
    setBy(mode);
    setInvalid(undefined);
    setSearch(null);
  };

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={t.registrationCheck.title}
          trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
        />
        {can('students.check_registration') ? (
          <>
            <RegistrationForm
              by={by}
              onBy={pick}
              text={text[by]}
              onText={(value) => setText((s) => ({ ...s, [by]: value }))}
              onSubmit={submit}
              busy={check.isFetching}
              error={invalid}
            />
            {!search || invalid ? null : check.isError ? (
              <ErrorState message={checkErrorText(check.error)} onRetry={() => void check.refetch()} />
            ) : check.data ? (
              <RegistrationResults view={check.data} by={search.by} />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

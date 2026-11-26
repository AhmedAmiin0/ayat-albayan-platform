import { teacherName } from '@ab/schedule';
import type { TeacherEarningView } from '@ab/money';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { t, Button, BackButton, ErrorState, Screen, ScreenHeader, locale } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { EarningsHeader, type Tab } from '@/earnings/components/EarningsHeader';
import { PaymentsList, SessionsList } from '@/earnings/components/EarningsList';
import { PayForm } from '@/earnings/components/PayForm';
import type { SessionFilter } from '@ab/client-core';
import { useEarningsBalance } from '@/earnings/hooks/queries';

/**
 * A teacher's earnings (admin: More > teachers > teacher): the balance, the sessions with ticks,
 * the payments, and the payment form for the ticked sessions (or everything outstanding).
 */
export function TeacherEarningsScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const scope = { teacherId: id };
  const balance = useEarningsBalance(scope);
  const [tab, setTab] = useState<Tab>('sessions');
  const [filter, setFilter] = useState<SessionFilter>('all');
  const [selected, setSelected] = useState<Map<string, TeacherEarningView>>(new Map());
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  // Stable: the session rows are memo, a tick redraws only the ticked row.
  const toggle = useCallback(
    (row: TeacherEarningView) =>
      setSelected((m) => {
        const next = new Map(m);
        if (!next.delete(row.id)) next.set(row.id, row);
        return next;
      }),
    [],
  );
  const back = <BackButton onPress={() => (paying ? setPaying(false) : router.back())} />;
  const title = balance.data ? `${t.earnings.title} · ${teacherName(balance.data.teacher, locale)}` : t.earnings.title;

  if (paying && balance.data) {
    return (
      <Screen>
        <ScreenHeader title={t.earnings.payTitle} leading={back} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
          <PayForm
            teacherId={id}
            selected={selected}
            outstanding={balance.data.outstanding}
            onDone={(replayed) => {
              setPaying(false);
              setSelected(new Map());
              setDone(replayed ? t.earnings.replayed : t.earnings.saved);
            }}
          />
        </ScrollView>
      </Screen>
    );
  }
  const header = (
    <EarningsHeader
      balance={balance.data}
      tab={tab}
      onTab={setTab}
      filter={filter}
      onFilter={setFilter}
    />
  );
  return (
    <Screen>
      <ScreenHeader title={title} leading={back} />
      {done ? <Note>{done}</Note> : null}
      {balance.isError && !balance.data ? (
        <ErrorState onRetry={() => void balance.refetch()} message={t.earnings.mobile.loadFailed} />
      ) : tab === 'sessions' ? (
        <SessionsList
          scope={scope}
          header={header}
          filter={filter}
          selected={selected}
          onToggle={toggle}
        />
      ) : (
        <PaymentsList scope={scope} header={header} />
      )}
      <Button
        label={selected.size > 0 ? t.earnings.payChosen.replace('{count}', String(selected.size)) : t.earnings.pay}
        disabled={!balance.data || balance.data.outstanding <= 0}
        onPress={() => {
          setDone(null);
          setPaying(true);
        }}
      />
    </Screen>
  );
}

import { router } from 'expo-router';
import type { ExpenseView } from '@ab/money';
import { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { BackButton, Button, LazyList, Screen, ScreenHeader, t } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseRow } from './ExpenseRow';
import { ExpenseTotals } from './ExpenseTotals';
import { currentMonth } from '@/finance/shared/month';
import { MonthPicker } from '@/finance/shared/MonthPicker';
import { useExpenseCategories, useExpenses } from '@/finance/shared/queries';
import { StaleNote, StateNote } from '@/finance/shared/StateNote';

export function ExpensesScreen() {
  const [month, setMonth] = useState(currentMonth());
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const expenses = useExpenses(month);
  const categories = useExpenseCategories();
  const rows = expenses.data ?? [];
  const cats = categories.data;
  const renderRow = useCallback(
    ({ item }: { item: ExpenseView }) => <ExpenseRow expense={item} categories={cats} />,
    [cats],
  );
  const back = <BackButton onPress={() => (adding ? setAdding(false) : router.back())} />;
  if (adding) {
    return (
      <Screen>
        <ScreenHeader title={t.mobileFinance.expenses.addTitle} leading={back} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <ExpenseForm
            categories={categories.data}
            onDone={() => {
              setAdding(false);
              setSaved(true);
            }}
          />
        </ScrollView>
      </Screen>
    );
  }
  return (
    <Screen>
      <ScreenHeader title={t.mobileFinance.rows.expenses} leading={back} />
      {saved ? <Note>{t.expenses.saved}</Note> : null}
      <MonthPicker month={month} onChange={setMonth} />
      <StaleNote isError={expenses.isError} hasData={!!expenses.data} />
      <LazyList
        data={rows}
        keyExtractor={(e) => e.id}
        renderItem={renderRow}
        tabBar={false}
        ListHeaderComponent={<ExpenseTotals rows={rows} categories={cats} />}
        refreshing={expenses.isRefetching}
        onRefresh={() => void expenses.refetch()}
        ListEmptyComponent={<StateNote status={expenses} empty emptyTitle={t.expenses.empty} />}
      />
      <Button
        label={t.expenses.add}
        onPress={() => {
          setSaved(false);
          setAdding(true);
        }}
      />
    </Screen>
  );
}

import { router } from 'expo-router';
import type { ExpenseView } from '@ab/shared';
import { useCallback, useState } from 'react';
import { FlatList, type ListRenderItemInfo, ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseRow } from './ExpenseRow';
import { ExpenseTotals } from './ExpenseTotals';
import { currentMonth } from '../shared/month';
import { MonthPicker } from '../shared/MonthPicker';
import { useExpenseCategories, useExpenses } from '../shared/queries';
import { StaleNote, StateNote } from '../shared/StateNote';

/**
 * «المصروفات» (admin; web /admin/expenses): the month's expenses with totals per category, and
 * «إضافة مصروف» with a receipt photo from the camera or the gallery. The rows sit in one inset card
 * under the totals (owner 2026-10-28: one container rule).
 */
export function ExpensesScreen() {
  const [month, setMonth] = useState(currentMonth());
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const expenses = useExpenses(month);
  const categories = useExpenseCategories();
  const rows = expenses.data ?? [];
  const cats = categories.data;
  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<ExpenseView>) => <ExpenseRow expense={item} categories={cats} />,
    [cats],
  );
  const cells = useInsetRows(renderRow, rows.length);
  const back = <Button variant="ghost" label={t.common.back} onPress={() => (adding ? setAdding(false) : router.back())} />;
  if (adding) {
    return (
      <Screen>
        <ScreenHeader title={t.mobileFinance.expenses.addTitle} trailing={back} />
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
      <ScreenHeader title={t.mobileFinance.rows.expenses} trailing={back} />
      {saved ? <Note>{t.expenses.saved}</Note> : null}
      <MonthPicker month={month} onChange={setMonth} />
      <StaleNote isError={expenses.isError} hasData={!!expenses.data} />
      <FlatList
        style={{ flex: 1 }}
        data={rows}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            <ExpenseTotals rows={rows} categories={cats} />
          </View>
        }
        {...cells}
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

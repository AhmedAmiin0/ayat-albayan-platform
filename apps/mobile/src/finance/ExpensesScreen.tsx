import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseRow } from './ExpenseRow';
import { ExpenseTotals } from './ExpenseTotals';
import { currentMonth } from './month';
import { MonthPicker } from './MonthPicker';
import { useExpenseCategories, useExpenses } from './queries';
import { StaleNote, StateNote } from './StateNote';

/**
 * «المصروفات» (admin; web /admin/expenses): the month's expenses with totals per category, and
 * «إضافة مصروف» with a receipt photo from the camera or the gallery.
 */
export function ExpensesScreen() {
  const [month, setMonth] = useState(currentMonth());
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const expenses = useExpenses(month);
  const categories = useExpenseCategories();
  const rows = expenses.data ?? [];
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
        style={{ flex: 1, marginHorizontal: -16 }}
        data={rows}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <ExpenseTotals rows={rows} categories={categories.data} />
          </View>
        }
        renderItem={({ item }) => <ExpenseRow expense={item} categories={categories.data} />}
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

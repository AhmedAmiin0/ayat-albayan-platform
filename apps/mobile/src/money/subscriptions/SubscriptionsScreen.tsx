import { router } from 'expo-router';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SubscriptionsList } from './SubscriptionsList';
import { TasksList } from '../tasks/TasksList';

type View = 'packages' | 'tasks';

/**
 * «الاشتراكات والتجديدات» (web /admin/subscriptions): the packages with their status and the
 * renewal highlight, and the open admin-task queue. Read-only; «سجّل دفعة» opens the payment form.
 * The list screens' compact top (owner 2026-10-28): title, pills and search 8pt apart.
 */
export function SubscriptionsScreen() {
  const [view, setView] = useState<View>('packages');
  return (
    <Screen list>
      <ScreenHeader
        title={t.mobileMoney.subscriptionsTitle}
        size="h2"
        connecting
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <FilterPills
        items={[
          { value: 'packages', label: t.mobileMoney.viewPackages },
          { value: 'tasks', label: t.mobileMoney.viewTasks },
        ]}
        value={view}
        onChange={setView}
        accessibilityLabel={t.mobileMoney.viewLabel}
      />
      {view === 'packages' ? <SubscriptionsList /> : <TasksList />}
    </Screen>
  );
}

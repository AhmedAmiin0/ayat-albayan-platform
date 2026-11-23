import { router } from 'expo-router';
import { useState } from 'react';
import { t, BackButton, FilterPills, Screen, ScreenHeader } from '@ab/mobile-kit';
import { SubscriptionsList } from '@/money/subscriptions/SubscriptionsList';
import { TasksList } from '@/money/tasks/TasksList';

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
        leading={<BackButton onPress={() => router.back()} />}
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

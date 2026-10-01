import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

// TODO(R-MOB-02): the more builder adds teachers, job applicants and settings here.
// Logout only signs out: the auth gate clears both caches and returns to /login (use-auth-gate).
export default function More() {
  return (
    <Screen>
      <ScreenHeader title={t.mobile.more} />
      <EmptyState title={t.common.empty} />
      <View style={{ alignItems: 'center' }}>
        <Button
          variant="ghost"
          label={t.auth.logout}
          onPress={() => void supabase.auth.signOut()}
        />
      </View>
    </Screen>
  );
}

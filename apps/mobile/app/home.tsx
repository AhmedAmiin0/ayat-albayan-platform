import { formatRunningHead } from '@ab/shared';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { type, useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Mark } from '@/ui/Mark';

// «النهارده» (R-MOB-02, docs/07 §12): the admin's morning screen. No frame, no cartouche on mobile.
// TODO(R-MOB-02): filter pills, timeline spine + now-line, lesson cards with تأكيد/إلغاء and the
// bottom tabs arrive with /lessons (Phase 2/5). Until then the list is honestly empty.
export default function AdminToday() {
  const { color } = useTheme();
  // TODO(R-MOB-02): Hijri date from the API (Hermes ICU has no reliable islamic-umalqura, docs/07 §2).
  const dateLine = `${formatRunningHead(new Date()).gregorian}. ${t.availability.tzHint.replace(
    '{tz}',
    t.runningHead.riyadh,
  )}`;

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.margin }} edges={['top']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 16 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              accessibilityRole="header"
              style={{
                fontFamily: type.display,
                fontSize: type.size.h1,
                lineHeight: type.lineHeight(type.size.h1, true),
                color: color.ink,
              }}
            >
              {t.mobile.today}
            </Text>
            <Mark size={28} />
          </View>
          <Text
            style={{
              fontFamily: type.ui[500],
              fontSize: type.size.xs,
              lineHeight: type.lineHeight(type.size.xs, true),
              color: color.ink2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {dateLine}
          </Text>
        </View>
        <EmptyState title={t.common.empty} />
        <View style={{ marginTop: 'auto', alignItems: 'center' }}>
          <Button variant="ghost" label={t.auth.logout} onPress={logout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

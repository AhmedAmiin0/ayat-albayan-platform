import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export default function AdminHome() {
  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t.admin.dashboardTitle}</Text>
      <Pressable onPress={logout} accessibilityRole="button">
        <Text>{t.auth.logout}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
});

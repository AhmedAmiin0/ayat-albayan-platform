import { Amiri_700Bold } from '@expo-google-fonts/amiri/700Bold';
import { IBMPlexSansArabic_400Regular } from '@expo-google-fonts/ibm-plex-sans-arabic/400Regular';
import { IBMPlexSansArabic_500Medium } from '@expo-google-fonts/ibm-plex-sans-arabic/500Medium';
import { IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold';
import { IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import { useTheme } from '@/theme';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Bundled files (docs/07 §2: Amiri 700 for titles, Plex for everything else); names match theme.type.
const fonts = {
  Amiri_700Bold,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
};

export default function RootLayout() {
  const [loaded, error] = useFonts(fonts);
  const { color } = useTheme();
  // On a load error fall through: the system Arabic font is better than a blank app.
  if (!loaded && !error) return null;
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.margin } }} />
    </>
  );
}

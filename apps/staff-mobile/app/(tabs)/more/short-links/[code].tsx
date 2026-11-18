import { useLocalSearchParams } from 'expo-router';
import { LinkDetailScreen } from '@/short-links';

export default function ShortLinkRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <LinkDetailScreen code={code} base="/more/short-links" />;
}

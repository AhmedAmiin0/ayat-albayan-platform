import { useLocalSearchParams } from 'expo-router';
import { TemplateEditScreen } from '@/inbox';

export default function TemplateEditRoute() {
  const { key } = useLocalSearchParams<{ key: string }>();
  return <TemplateEditScreen templateKey={key} />;
}

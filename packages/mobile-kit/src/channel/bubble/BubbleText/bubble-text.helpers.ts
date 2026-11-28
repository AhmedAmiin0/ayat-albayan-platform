import { Linking } from 'react-native';

export const open = (href: string) => void Linking.openURL(href).catch(() => undefined);

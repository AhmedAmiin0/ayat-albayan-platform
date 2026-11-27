import Constants from 'expo-constants';
import { t } from '@ab/mobile-kit';

export const versionLine = (): string =>
  t.portal.app.account.version.replace('{v}', Constants.expoConfig?.version ?? '');

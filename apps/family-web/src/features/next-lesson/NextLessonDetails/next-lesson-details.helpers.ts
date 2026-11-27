import type { CardRoom } from '@ab/client-core';
import { t } from '@ab/web-kit';

export const joinLabel = (kind: CardRoom['kind']): string | undefined =>
  kind === 'live' ? t.portal.app.live.join : undefined;

import { useQuery } from '@tanstack/react-query';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { accessQuery } from '@ab/web-kit/report/public-api';
import type { CodeGateProps } from './CodeGate.types';

export function useCodeGate({ publicId }: Pick<CodeGateProps, 'publicId'>) {
  const g = t.reportPage.gate;
  const access = useQuery(accessQuery(publicId));
  return { g, access };
}

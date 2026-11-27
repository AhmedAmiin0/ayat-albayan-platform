import { alertSections } from '@ab/client-core';
import { useNow, useViewerTz } from '@ab/web-kit';
import type { AlertListProps } from './AlertList.types';

export function useAlertList({ page }: Pick<AlertListProps, 'page'>) {
  const tz = useViewerTz();
  const sections = alertSections(page.items, useNow(), tz);
  return { tz, sections };
}

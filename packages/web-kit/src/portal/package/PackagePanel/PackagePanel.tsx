import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import type { PackagePanelProps } from './PackagePanel.types';
import { PackageBody } from './PackageBody';
import { usePackagePanel } from './use-package-panel';

/** docs/50 §2: a guardian's or adult student's only; no WhatsApp link. */
export function PackagePanel({ student }: PackagePanelProps) {
  const { query } = usePackagePanel({ student });
  return <QueryState query={query}>{(view) => <PackageBody view={view} />}</QueryState>;
}

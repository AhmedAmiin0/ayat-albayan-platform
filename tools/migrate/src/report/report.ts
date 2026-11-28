// out/report.md: counts only (R-MIG-02). Safe to paste into a PR or chat: no names, no phones.
import { SKIPPED_TABS } from '../sources/headers/headers.ts';
import type { SheetManifest } from '../sources/extract-sheets.ts';
import { APPLY_ORDER } from '../types.ts';
import type { Plan, RowIssue } from '../types.ts';

const ACTIONS = ['create', 'update', 'adopt', 'skip', 'reject', 'review'] as const;

function issueTable(issues: readonly RowIssue[]): string[] {
  const counts = new Map<string, number>();
  for (const i of issues) {
    const k = `| ${i.entity} | ${i.code} | ${i.severity} |`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [
    '| entity | issue | severity | rows |',
    '|---|---|---|---|',
    ...[...counts].sort().map(([k, n]) => `${k} ${n} |`),
  ];
}

/**
 * Students the old status rule made active without a current subscription: reason→status → count.
 */
export function downgradeCounts(issues: readonly RowIssue[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of issues)
    if (i.code === 'status_downgrade' && i.detail) out[i.detail] = (out[i.detail] ?? 0) + 1;
  return out;
}

function downgradeTable(issues: readonly RowIssue[]): string[] {
  const rows = Object.entries(downgradeCounts(issues))
    .sort()
    .map(([d, n]) => `| ${d.replace('→', ' | ')} | ${n} |`);
  if (!rows.length) return [];
  const head = ['| old reason (was active) | imported status | students |', '|---|---|---|'];
  return ['', '## Student status: no longer «مشترك»', '', ...head, ...rows];
}

function planSection(plan: Plan): string[] {
  const lines = [
    `# Import ${plan.target === 'production' ? 'PRODUCTION' : plan.target} — ${plan.createdAt}`,
    '',
  ];
  lines.push(
    '## Plan',
    '',
    `| entity | ${ACTIONS.join(' | ')} |`,
    `|---|${ACTIONS.map(() => '---|').join('')}`,
  );
  for (const e of APPLY_ORDER) {
    const c = plan.counts[e];
    if (c) lines.push(`| ${e} | ${ACTIONS.map((a) => c[a]).join(' | ')} |`);
  }
  lines.push('', '## Issues', '', ...issueTable(plan.issues), ...downgradeTable(plan.issues));
  return lines;
}

function unmappedHeaders(manifest: SheetManifest): string[] {
  const unknown = Object.entries(manifest.unknownHeaders);
  if (!unknown.length) return [];
  return ['', 'Unmapped headers: ' + unknown.map(([id, hs]) => `${id} (${hs.length})`).join(', ')];
}

function sourcesSection(manifest: SheetManifest | undefined): string[] {
  if (!manifest) return [];
  return [
    '',
    `## Sources`,
    '',
    `Drive export \`${manifest.zip}\` (sha256 ${manifest.sha256.slice(0, 12)}…)`,
    '',
    '| sheet | rows |',
    '|---|---|',
    ...Object.entries(manifest.rows).map(([id, n]) => `| ${id} | ${n} |`),
    ...unmappedHeaders(manifest),
  ];
}

function crmSection(crm: Record<string, number> | undefined): string[] {
  if (!crm) return [];
  return [
    '',
    '| CRM table | rows |',
    '|---|---|',
    ...Object.entries(crm).map(([t, n]) => `| ${t} | ${n} |`),
  ];
}

export function reportMarkdown(o: {
  plan: Plan;
  manifest?: SheetManifest;
  crm?: Record<string, number>;
}): string {
  return [
    ...planSection(o.plan),
    ...sourcesSection(o.manifest),
    ...crmSection(o.crm),
    '',
    '## Not imported',
    '',
    ...Object.entries(SKIPPED_TABS).map(([tab, why]) => `- ${tab}: ${why}`),
    '',
  ].join('\n');
}

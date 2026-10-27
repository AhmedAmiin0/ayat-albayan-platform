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

/** Students the old status rule made active without a current subscription: reason→status → count. */
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

export function reportMarkdown(o: {
  plan: Plan;
  manifest?: SheetManifest;
  crm?: Record<string, number>;
}): string {
  const { plan } = o;
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
  if (o.manifest) {
    lines.push(
      '',
      `## Sources`,
      '',
      `Drive export \`${o.manifest.zip}\` (sha256 ${o.manifest.sha256.slice(0, 12)}…)`,
      '',
    );
    lines.push(
      '| sheet | rows |',
      '|---|---|',
      ...Object.entries(o.manifest.rows).map(([id, n]) => `| ${id} | ${n} |`),
    );
    const unknown = Object.entries(o.manifest.unknownHeaders);
    if (unknown.length)
      lines.push(
        '',
        'Unmapped headers: ' + unknown.map(([id, hs]) => `${id} (${hs.length})`).join(', '),
      );
  }
  if (o.crm)
    lines.push(
      '',
      '| CRM table | rows |',
      '|---|---|',
      ...Object.entries(o.crm).map(([t, n]) => `| ${t} | ${n} |`),
    );
  lines.push(
    '',
    '## Not imported',
    '',
    ...Object.entries(SKIPPED_TABS).map(([tab, why]) => `- ${tab}: ${why}`),
    '',
  );
  return lines.join('\n');
}

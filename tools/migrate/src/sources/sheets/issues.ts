// RowIssue builders for sheet mappers. `code` and `detail` stay Arabic-free (machine reasons); the
// owner-facing Arabic label is looked up by issueLabelKey(code) in ar.json (`migrate.issue.<code>`).
import type {
  EntityName,
  IssueCode,
  IssueSeverity,
  Mapped,
  NaturalKey,
  RowIssue,
  SourceRef,
  TargetRecord,
} from '../../types.ts';

export function issueLabelKey(code: IssueCode): string {
  return `migrate.issue.${code}`;
}

export interface IssueInput {
  code: IssueCode;
  severity: IssueSeverity;
  field?: string;
  detail?: string;
}

/** Issue factory bound to one entity + source row. */
export function issuesFor(entity: EntityName, ref: SourceRef) {
  return (i: IssueInput): RowIssue => ({ entity, ref, ...i });
}

export function rejected(ref: SourceRef, issues: RowIssue[]): Mapped {
  return { ok: false, ref, issues };
}

/** Issues that belong to no accepted record, as one rejected Mapped per source row. */
export function issueOnly(issues: readonly RowIssue[]): Mapped[] {
  const byRow = new Map<string, RowIssue[]>();
  for (const i of issues) {
    const id = `${i.ref.source}|${i.ref.tab}|${i.ref.file ?? ''}|${i.ref.row}`;
    byRow.set(id, [...(byRow.get(id) ?? []), i]);
  }
  return [...byRow.values()].flatMap((list) => (list[0] ? [rejected(list[0].ref, list)] : []));
}

interface OkInput {
  key: NaturalKey;
  ref: SourceRef;
  columns: TargetRecord['columns'];
  refs?: TargetRecord['refs'];
  issues?: RowIssue[];
  aliases?: readonly string[];
}

export function accepted(o: OkInput): Mapped {
  const aliases = o.aliases?.length ? { aliases: o.aliases } : {};
  return {
    ok: true,
    key: o.key,
    ref: o.ref,
    value: { columns: o.columns, refs: o.refs ?? {}, ...aliases },
    issues: o.issues ?? [],
  };
}

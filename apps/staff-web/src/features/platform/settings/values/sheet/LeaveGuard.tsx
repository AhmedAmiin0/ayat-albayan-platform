import { RouteLeaveGuard, t } from '@ab/web-kit';

const l = t.settingsValues.leave;

/** Unsaved rows ask before leaving (docs/26b §2); switching group or searching keeps edits. */
export function LeaveGuard({ names }: { names: readonly string[] }) {
  const list = names.map((n) => `«${n}»`).join(t.common.listSeparator);
  return (
    <RouteLeaveGuard
      when={names.length > 0}
      words={{ ...l, body: l.body.replace('{names}', list) }}
    />
  );
}

import type { GraphBody } from '@/modules/messaging/whatsapp/messages/wa-components';
import type { MediaSend, TemplateSend, WaSent } from '@/modules/messaging/whatsapp/whatsapp.types';
import { graphTemplate } from './waba-graph';
import { sendReport, wabaReport } from './waba-report';
import { sentAs, wabaTemplate, type WabaTemplate } from './waba-template';

// A registry row's send on a Graph line (meta, kapso): the WABA template the crm driver would send
// (waba-template.ts), or the old script's report as two sends (waba-report.ts).

/** The client's own calls: one Graph message (allow-list, POST, wamid parse) and a file by link. */
interface GraphPorts {
  post: (to: string, build: () => GraphBody) => Promise<WaSent>;
  document: (input: MediaSend) => Promise<WaSent>;
}

/** A refused template keeps the WABA name it went as (template-missing.ts compares it). */
async function postWaba(to: string, build: () => WabaTemplate, ports: GraphPorts): Promise<WaSent> {
  let name = '';
  const graph = (): GraphBody => {
    const t = build();
    name = t.name;
    return graphTemplate(to, t);
  };
  return ports.post(to, graph).catch((e: unknown) => {
    throw name ? sentAs(e, name) : e;
  });
}

export function sendGraphTemplate(input: TemplateSend, ports: GraphPorts): Promise<WaSent> {
  const report = wabaReport(input);
  if (!report) return postWaba(input.to, () => wabaTemplate(input), ports);
  return sendReport({
    document: () => ports.document(report.document),
    template: () => postWaba(input.to, () => report.template, ports),
  });
}

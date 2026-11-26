import { templateBodySchema, type TemplateParam } from './stub-template.schemas.ts';

/** The first parameter of a sent template's component of `type` (header, body, button). */
export function templateParam(body: unknown, type: string): TemplateParam | undefined {
  const parsed = templateBodySchema.safeParse(body);
  const component = parsed.data?.template.components.find((c) => c.type === type);
  return component?.parameters?.[0];
}

import { z } from 'zod';

export const templateParamSchema = z.looseObject({
  text: z.string().optional(),
  document: z.object({ link: z.string(), filename: z.string() }).optional(),
});
export type TemplateParam = z.infer<typeof templateParamSchema>;

export const templateBodySchema = z.looseObject({
  template: z.looseObject({
    components: z.array(
      z.looseObject({ type: z.string(), parameters: z.array(templateParamSchema).optional() }),
    ),
  }),
});

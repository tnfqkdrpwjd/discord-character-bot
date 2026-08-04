import { z } from "zod";

export const StatusSchema = z
  .object({
    label: z.string(),
    value: z.coerce.number().default(0),
    max: z.coerce.number().optional(),
  })
  .transform((v) => ({
    ...v,
    max: v.max ?? v.value,
  }));

export const ParamSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const CharacterSchema = z.object({
  name: z.string().min(1, "name은 필수입니다"),
  initiative: z.coerce.number().optional().default(0),
  status: z.array(StatusSchema).optional().default([]),
  params: z.array(ParamSchema).optional().default([]),
  commands: z.string().optional().default(""),
  permittedUserIds: z.array(z.string()).optional().default([]),
});

export const ClipboardSchema = z.object({
  kind: z.literal("character"),
  data: z.record(z.any()),
});

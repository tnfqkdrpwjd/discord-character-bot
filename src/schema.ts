import { z } from 'zod';

export const StatusSchema = z.object({
  label: z.string(),
  value: z.number(),
  max: z.number(),
});

export const ParamSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const CharacterSchema = z.object({
  name: z.string().min(1, 'name은 필수입니다'),
  memo: z.string().optional().default(''),
  initiative: z.number().optional().default(0),
  status: z.array(StatusSchema).optional().default([]),
  params: z.array(ParamSchema).optional().default([]),
  commands: z.string().optional().default(''),
  permittedUserIds: z.array(z.string()).optional().default([]),
});

export const ClipboardSchema = z.object({
  kind: z.literal('character'),
  data: z.record(z.any()),
});

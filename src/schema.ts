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

// commands는 문자열("\n"으로 구분)이나 배열 둘 다 입력으로 받되, 저장은 항상 배열로 정규화합니다.
const CommandsSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    return val.split("\n").map((l) => l.trim()).filter(Boolean);
  }
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }
  return [];
}, z.array(z.string()));

export const CharacterSchema = z.object({
  name: z.string().min(1, "name은 필수입니다"),
  memo: z.string().optional().default(""),
  initiative: z.coerce.number().optional().default(0),
  status: z.array(StatusSchema).optional().default([]),
  params: z.array(ParamSchema).optional().default([]),
  commands: CommandsSchema.optional().default([]),
  permittedUserIds: z.array(z.string()).optional().default([]),
});

export const ClipboardSchema = z.object({
  kind: z.literal("character"),
  data: z.record(z.any()),
});

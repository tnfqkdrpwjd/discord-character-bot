import type { CharacterRecord } from "../types.js";

/**
 * 텍스트 안의 {라벨} 형태를 해당 캐릭터의 status 또는 params 값으로 치환합니다.
 * 일치하는 라벨이 없으면 원문 그대로 둡니다.
 * 예: params에 { "label": "기1", "value": "사랑 " }가 있으면 "{기1}" → "사랑"
 */
export function resolvePlaceholders(record: CharacterRecord, text: string): string {
  return text.replace(/\{([^{}]+)\}/g, (whole, label: string) => {
    const status = record.data.status.find((s) => s.label === label);
    if (status) return String(status.value);

    const param = record.data.params.find((p) => p.label === label);
    if (param) return param.value.trim();

    return whole; // 일치하는 게 없으면 그대로 둠
  });
}

export const CATEGORY_LABELS: Record<string, string> = {
  trending: "트렌드",
  jp_mystery: "일본 미스테리",
  mystery: "미스테리",
  crypto: "암호화폐",
  finance: "금융",
  tech: "테크",
  ai: "AI",
  world: "세상",
  korea: "한국",
  viral: "화제",
  science: "과학",
  health: "건강",
  sports: "스포츠",
  entertainment: "엔터",
  fun: "힐링",
  realestate: "부동산",
  life: "라이프",
};

// 영구 보존 카테고리 (백엔드 PERMANENT_CATEGORIES와 동기화)
export const PERMANENT_CATEGORIES = new Set<string>(["jp_mystery"]);

export function labelFor(id: string): string {
  return CATEGORY_LABELS[id] ?? id;
}

export const ALL_CATEGORY = "all";

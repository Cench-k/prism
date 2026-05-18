export const CATEGORY_LABELS: Record<string, string> = {
  crypto: "암호화폐",
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
  finance: "금융",
  life: "라이프",
};

export function labelFor(id: string): string {
  return CATEGORY_LABELS[id] ?? id;
}

export const ALL_CATEGORY = "all";

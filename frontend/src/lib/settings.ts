export type AiProvider = "anthropic" | "openai" | "gemini";

export const PROVIDERS: AiProvider[] = ["anthropic", "openai", "gemini"];

export type ProviderModel = {
  id: string;
  label: string;
  tag?: "추천" | "고품질" | "무료 한도";
};

export type ProviderMeta = {
  label: string;
  defaultModel: string;
  models: ProviderModel[];
  keyHint: string;
  consoleUrl: string;
  pricingNote: string;
};

export const PROVIDER_META: Record<AiProvider, ProviderMeta> = {
  anthropic: {
    label: "Anthropic (Claude)",
    defaultModel: "claude-haiku-4-5-20251001",
    models: [
      {
        id: "claude-haiku-4-5-20251001",
        label: "Claude Haiku 4.5 — 빠르고 저렴",
        tag: "추천",
      },
      {
        id: "claude-sonnet-4-6",
        label: "Claude Sonnet 4.6 — 균형",
      },
      {
        id: "claude-opus-4-7",
        label: "Claude Opus 4.7 — 최고 품질",
        tag: "고품질",
      },
    ],
    keyHint: "sk-ant-api03-...",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    pricingNote: "Haiku 4.5 기준 1회 요약 ≈ $0.0001. 신규 가입 시 무료 크레딧 제공.",
  },
  openai: {
    label: "OpenAI (ChatGPT)",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini — 빠르고 저렴", tag: "추천" },
      { id: "gpt-4o", label: "GPT-4o — 고품질", tag: "고품질" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini (있다면)" },
      { id: "gpt-4.1", label: "GPT-4.1 (있다면)" },
    ],
    keyHint: "sk-... 또는 sk-proj-...",
    consoleUrl: "https://platform.openai.com/api-keys",
    pricingNote: "gpt-4o-mini 기준 1회 요약 ≈ $0.0002. 무료 크레딧은 제한적.",
  },
  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-2.0-flash",
    models: [
      {
        id: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash — 최신 빠른 모델",
        tag: "무료 한도",
      },
      {
        id: "gemini-2.0-flash-lite",
        label: "Gemini 2.0 Flash Lite — 더 저렴",
        tag: "무료 한도",
      },
      {
        id: "gemini-1.5-flash",
        label: "Gemini 1.5 Flash — 이전 세대 안정",
        tag: "무료 한도",
      },
      {
        id: "gemini-1.5-pro",
        label: "Gemini 1.5 Pro — 고품질",
        tag: "고품질",
      },
    ],
    keyHint: "AIza...",
    consoleUrl: "https://aistudio.google.com/apikey",
    pricingNote: "Gemini Flash 시리즈는 일정 RPM/일 한도 내 무료로 사용 가능합니다.",
  },
};

const K_PROVIDER = "prism.aiProvider";
const K_KEY = "prism.aiKey";
const K_MODEL = "prism.aiModel";

function _read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function _write(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    /* localStorage disabled */
  }
}

export function getProvider(): AiProvider {
  const v = _read(K_PROVIDER);
  if (v === "openai" || v === "gemini" || v === "anthropic") return v;
  return "anthropic";
}

export function setProvider(p: AiProvider): void {
  _write(K_PROVIDER, p);
}

export function getApiKey(): string {
  return _read(K_KEY) ?? "";
}

export function setApiKey(value: string): void {
  _write(K_KEY, value.trim());
}

export function clearApiKey(): void {
  setApiKey("");
}

export function getModel(): string {
  return _read(K_MODEL) ?? "";
}

export function setModel(value: string): void {
  _write(K_MODEL, value.trim());
}

export function hasUsableConfig(): boolean {
  return !!getApiKey().trim();
}

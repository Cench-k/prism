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
    defaultModel: "gemini-2.5-flash",
    models: [
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash — 추천",
        tag: "무료 한도",
      },
      {
        id: "gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash Lite — 가장 빠르고 저렴",
        tag: "무료 한도",
      },
      {
        id: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro — 고품질",
        tag: "무료 한도",
      },
      {
        id: "gemini-3-flash-preview",
        label: "Gemini 3 Flash (Preview) — 최신 미리보기",
        tag: "무료 한도",
      },
      {
        id: "gemini-3.1-pro-preview",
        label: "Gemini 3.1 Pro (Preview) — 최고 성능",
        tag: "고품질",
      },
    ],
    keyHint: "AIza...",
    consoleUrl: "https://aistudio.google.com/apikey",
    pricingNote:
      "AI Studio 무료 티어에서 2.5 시리즈 전부 + 3.x preview를 무료로 사용 가능합니다 (분당 호출 한도 적용).",
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

// --- 라이브 모델 캐시 (provider별) -----------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type LiveModelCache = {
  fetchedAt: number;
  models: { id: string; label: string }[];
};

function _cacheKey(provider: AiProvider) {
  return `prism.liveModels.${provider}`;
}

export function getCachedLiveModels(
  provider: AiProvider
): LiveModelCache | null {
  const raw = _read(_cacheKey(provider));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LiveModelCache;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedLiveModels(
  provider: AiProvider,
  models: { id: string; label: string }[]
): void {
  const payload: LiveModelCache = { fetchedAt: Date.now(), models };
  _write(_cacheKey(provider), JSON.stringify(payload));
}

export function clearCachedLiveModels(provider: AiProvider): void {
  _write(_cacheKey(provider), "");
}

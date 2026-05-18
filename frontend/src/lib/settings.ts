export type AiProvider = "anthropic" | "openai" | "gemini";

export const PROVIDERS: AiProvider[] = ["anthropic", "openai", "gemini"];

export const PROVIDER_META: Record<
  AiProvider,
  {
    label: string;
    defaultModel: string;
    keyHint: string;
    keyPrefix: string;
    consoleUrl: string;
    pricingNote: string;
  }
> = {
  anthropic: {
    label: "Anthropic (Claude)",
    defaultModel: "claude-haiku-4-5-20251001",
    keyHint: "sk-ant-api03-...",
    keyPrefix: "sk-ant-",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    pricingNote: "Haiku 4.5 기준 1회 요약 ≈ $0.0001",
  },
  openai: {
    label: "OpenAI (ChatGPT)",
    defaultModel: "gpt-4o-mini",
    keyHint: "sk-... 또는 sk-proj-...",
    keyPrefix: "sk-",
    consoleUrl: "https://platform.openai.com/api-keys",
    pricingNote: "gpt-4o-mini 기준 1회 요약 ≈ $0.0002",
  },
  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-1.5-flash",
    keyHint: "AIza...",
    keyPrefix: "",
    consoleUrl: "https://aistudio.google.com/apikey",
    pricingNote: "gemini-1.5-flash 무료 할당량 사용 가능",
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

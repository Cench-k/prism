const KEY = "prism.anthropicApiKey";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setApiKey(value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value.trim()) {
      window.localStorage.setItem(KEY, value.trim());
    } else {
      window.localStorage.removeItem(KEY);
    }
  } catch {
    /* localStorage disabled */
  }
}

export function clearApiKey(): void {
  setApiKey("");
}

export function hasApiKey(): boolean {
  const v = getApiKey();
  return !!v && v.startsWith("sk-ant-");
}

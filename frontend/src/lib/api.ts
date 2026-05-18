import type {
  ArticleListResponse,
  CardNews,
  CryptoTicker,
  Summary,
} from "@/types/article";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function fetchArticles(params: {
  category?: string;
  cursor?: string;
  limit?: number;
} = {}): Promise<ArticleListResponse> {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${BASE}/api/articles?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`articles fetch failed: ${res.status}`);
  return res.json();
}

export type CategoryItem = { id: string; count: number };

export async function fetchCategories(): Promise<CategoryItem[]> {
  const res = await fetch(`${BASE}/api/categories`, { cache: "no-store" });
  if (!res.ok) throw new Error(`categories fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.items ?? []) as CategoryItem[];
}

export async function fetchCryptoWidget(): Promise<{ tickers: CryptoTicker[] }> {
  const res = await fetch(`${BASE}/api/widgets/crypto`, { cache: "no-store" });
  if (!res.ok) throw new Error(`crypto widget fetch failed: ${res.status}`);
  return res.json();
}

export type LiveModel = { id: string; label: string };

export async function fetchLiveModels(
  provider: string,
  apiKey: string
): Promise<LiveModel[]> {
  const res = await fetch(`${BASE}/api/llm/models`, {
    method: "GET",
    headers: {
      "X-AI-Provider": provider,
      "X-AI-Key": apiKey,
    },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `models fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.models ?? []) as LiveModel[];
}

export async function summarizeArticle(
  articleId: string,
  cfg: { provider: string; apiKey: string; model?: string }
): Promise<{ summary: Summary; cached: boolean }> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-AI-Provider": cfg.provider,
    "X-AI-Key": cfg.apiKey,
  };
  if (cfg.model) headers["X-AI-Model"] = cfg.model;
  const res = await fetch(`/api/articles/${articleId}/summarize`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `summarize failed: ${res.status}`);
  }
  return res.json();
}

export async function generateCardNews(
  articleId: string,
  cfg: { provider: string; apiKey: string; model?: string; regenerate?: boolean }
): Promise<{ cardnews: CardNews; cached: boolean }> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-AI-Provider": cfg.provider,
    "X-AI-Key": cfg.apiKey,
  };
  if (cfg.model) headers["X-AI-Model"] = cfg.model;
  const qs = cfg.regenerate ? "?regenerate=true" : "";
  const res = await fetch(`/api/articles/${articleId}/cardnews${qs}`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `cardnews failed: ${res.status}`);
  }
  return res.json();
}

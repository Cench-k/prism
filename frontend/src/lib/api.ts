import type { ArticleListResponse, CryptoTicker, Summary } from "@/types/article";

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

export async function fetchCryptoWidget(): Promise<{ tickers: CryptoTicker[] }> {
  const res = await fetch(`${BASE}/api/widgets/crypto`, { cache: "no-store" });
  if (!res.ok) throw new Error(`crypto widget fetch failed: ${res.status}`);
  return res.json();
}

export async function summarizeArticle(
  articleId: string,
  apiKey: string | null
): Promise<{ summary: Summary; cached: boolean }> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (apiKey) headers["X-Anthropic-Key"] = apiKey;
  const res = await fetch(`${BASE}/api/articles/${articleId}/summarize`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `summarize failed: ${res.status}`);
  }
  return res.json();
}

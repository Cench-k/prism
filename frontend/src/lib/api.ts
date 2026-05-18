import type { ArticleListResponse, CryptoTicker } from "@/types/article";

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

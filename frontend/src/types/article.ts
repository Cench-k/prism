export type Summary = {
  headline: string;
  background: string;
};

export type CardSlide =
  | { type: "cover"; title: string; subtitle?: string }
  | { type: "context"; body: string }
  | { type: "point"; heading: string; body: string }
  | { type: "outro"; headline: string; cta?: string };

export type CardNews = {
  slides: CardSlide[];
};

export type Article = {
  _id: string;
  source_id: string;
  category: string;
  subcategory?: string | null;
  lang: string;
  title: string;
  url: string;
  image_url?: string | null;
  content?: string | null;
  summary?: Summary | null;
  cardnews?: CardNews | null;
  meta_data?: Record<string, unknown>;
  published_at?: string | null;
  collected_at: string;
};

export type ArticleListResponse = {
  items: Article[];
  next_cursor: string | null;
};

export type CryptoTicker = {
  symbol: string;
  price_usd: number | null;
  change_24h_pct: number | null;
};

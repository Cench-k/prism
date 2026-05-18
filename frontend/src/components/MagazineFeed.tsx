"use client";

import { useEffect, useRef, useState } from "react";
import MagazineCard from "./MagazineCard";
import SummaryPanel from "./SummaryPanel";
import { fetchArticles } from "@/lib/api";
import type { Article } from "@/types/article";

type Props = {
  category?: string;
};

export default function MagazineFeed({ category }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = async () => {
    if (loading || done) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchArticles({
        category,
        cursor: cursor ?? undefined,
        limit: 10,
      });
      setArticles((prev) => [...prev, ...res.items]);
      setCursor(res.next_cursor);
      if (!res.next_cursor) setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, done, loading]);

  const open = openIdx !== null;
  const activeArticle = openIdx !== null ? articles[openIdx] : null;

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <div className="snap-y-pages h-full w-full overflow-y-scroll">
        {articles.map((a, idx) => (
          <MagazineCard
            key={a._id}
            article={a}
            onSwipeUp={() => setOpenIdx(idx)}
          />
        ))}
        {!done && (
          <div
            ref={sentinelRef}
            className="flex h-24 items-center justify-center text-xs text-white/40"
          >
            {loading ? "불러오는 중…" : "스크롤하면 더 보기"}
          </div>
        )}
        {error && (
          <div className="flex h-24 items-center justify-center text-xs text-rose-400">
            {error}
          </div>
        )}
        {articles.length === 0 && !loading && !error && (
          <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-8 text-center">
            <h2 className="font-serif text-2xl text-white">아직 기사가 없습니다.</h2>
            <p className="text-sm text-white/60">
              백엔드 디렉토리에서 <code className="text-white/80">python -m scripts.ingest</code>
              를 실행해 RSS를 수집해 주세요.
            </p>
          </div>
        )}
      </div>

      <SummaryPanel
        article={activeArticle}
        open={open}
        onClose={() => setOpenIdx(null)}
      />
    </main>
  );
}

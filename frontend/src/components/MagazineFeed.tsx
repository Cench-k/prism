"use client";

import Link from "next/link";
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
      <Link
        href="/settings"
        aria-label="설정"
        className="absolute right-4 top-5 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </Link>

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
              잠시 후 다시 새로고침해 주세요. 자동 수집이 1시간마다 동작합니다.
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

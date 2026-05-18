"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import MagazineCard from "./MagazineCard";
import SummaryPanel from "./SummaryPanel";
import CardNewsModal from "./cardnews/CardNewsModal";
import { fetchArticles, fetchCategories, type CategoryItem } from "@/lib/api";
import { ALL_CATEGORY, labelFor } from "@/lib/categories";
import type { Article } from "@/types/article";

export default function MagazineFeed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("c") || ALL_CATEGORY;

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [cardNewsIdx, setCardNewsIdx] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const feedScrollerRef = useRef<HTMLDivElement>(null);

  // 카테고리 목록 로드 (한 번)
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchArticles({
        category: category === ALL_CATEGORY ? undefined : category,
        limit: 10,
      });
      setArticles(res.items);
      setCursor(res.next_cursor);
      setDone(!res.next_cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [category]);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchArticles({
        category: category === ALL_CATEGORY ? undefined : category,
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
  }, [category, cursor, done, loading]);

  // 카테고리 바뀌면 처음부터 다시 로드
  useEffect(() => {
    setArticles([]);
    setCursor(null);
    setDone(false);
    setOpenIdx(null);
    if (feedScrollerRef.current) feedScrollerRef.current.scrollTop = 0;
    loadFirstPage();
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
  }, [loadMore]);

  const onPickCategory = (c: string) => {
    const next = c === ALL_CATEGORY ? "/" : `/?c=${encodeURIComponent(c)}`;
    router.replace(next, { scroll: false });
  };

  const open = openIdx !== null;
  const activeArticle = openIdx !== null ? articles[openIdx] : null;

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      {/* 상단 카테고리 바 + 설정 아이콘 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center gap-2 px-3 pt-3">
        <div className="pointer-events-auto flex-1 overflow-x-auto">
          <div className="flex gap-2 pr-2">
            <CategoryChip
              active={category === ALL_CATEGORY}
              onClick={() => onPickCategory(ALL_CATEGORY)}
              label="전체"
            />
            {categories.map((c) => (
              <CategoryChip
                key={c.id}
                active={category === c.id}
                onClick={() => onPickCategory(c.id)}
                label={labelFor(c.id)}
                count={c.count}
              />
            ))}
          </div>
        </div>

        <Link
          href="/settings"
          aria-label="설정"
          className="pointer-events-auto flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
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
      </div>

      <div
        ref={feedScrollerRef}
        className="snap-y-pages h-full w-full overflow-y-scroll"
      >
        {articles.map((a, idx) => (
          <MagazineCard
            key={a._id}
            article={a}
            onSwipeUp={() => setOpenIdx(idx)}
          />
        ))}
        {!done && articles.length > 0 && (
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
            <h2 className="font-serif text-2xl text-white">
              {category === ALL_CATEGORY
                ? "아직 기사가 없습니다."
                : `'${labelFor(category)}' 카테고리에 기사가 없습니다.`}
            </h2>
            <p className="text-sm text-white/60">
              자동 수집은 1시간마다 동작합니다. 다른 카테고리를 선택해보세요.
            </p>
          </div>
        )}
      </div>

      <SummaryPanel
        article={activeArticle}
        open={open}
        onClose={() => setOpenIdx(null)}
        onMakeCardNews={
          openIdx !== null
            ? () => {
                setCardNewsIdx(openIdx);
                setOpenIdx(null);
              }
            : undefined
        }
      />

      <CardNewsModal
        article={cardNewsIdx !== null ? articles[cardNewsIdx] : null}
        open={cardNewsIdx !== null}
        onClose={() => setCardNewsIdx(null)}
      />
    </main>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium backdrop-blur-md transition ${
        active
          ? "bg-white text-black"
          : "bg-white/10 text-white/80 hover:bg-white/15"
      }`}
    >
      {label}
      {typeof count === "number" && (
        <span className={`ml-1.5 text-[10px] ${active ? "text-black/50" : "text-white/40"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

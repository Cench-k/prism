"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

import type { Article, CardNews } from "@/types/article";
import { generateCardNews } from "@/lib/api";
import { getApiKey, getProvider, getModel, hasUsableConfig } from "@/lib/settings";
import Slide from "./Slide";

type Props = {
  article: Article | null;
  open: boolean;
  onClose: () => void;
};

function safeFilename(s: string): string {
  return s
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/\s+/g, "_")
    .slice(0, 40) || "card";
}

export default function CardNewsModal({ article, open, onClose }: Props) {
  const [cardnews, setCardnews] = useState<CardNews | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [hasKey, setHasKey] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (open) setHasKey(hasUsableConfig());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setError(null);
    setCardnews(article?.cardnews ?? null);
  }, [article, open]);

  const generate = useCallback(
    async (regenerate = false) => {
      if (!article) return;
      const apiKey = getApiKey();
      if (!apiKey) {
        setError("설정에서 API 키를 먼저 입력해주세요.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await generateCardNews(article._id, {
          provider: getProvider(),
          apiKey,
          model: getModel() || undefined,
          regenerate,
        });
        setCardnews(res.cardnews);
        setIndex(0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "카드뉴스 생성 실패");
      } finally {
        setLoading(false);
      }
    },
    [article]
  );

  const downloadCurrent = async () => {
    const el = slideRefs.current[index];
    if (!el || !article) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#000",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `prism_${safeFilename(article.title)}_${index + 1}.png`;
      link.click();
    } catch (e) {
      setError(e instanceof Error ? `다운로드 실패: ${e.message}` : "다운로드 실패");
    } finally {
      setDownloading(false);
    }
  };

  const downloadAll = async () => {
    if (!cardnews || !article) return;
    setDownloading(true);
    try {
      for (let i = 0; i < cardnews.slides.length; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;
        const dataUrl = await toPng(el, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#000",
        });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `prism_${safeFilename(article.title)}_${i + 1}.png`;
        link.click();
        // 브라우저가 연속 다운로드 차단 안 하도록 살짝 지연
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch (e) {
      setError(e instanceof Error ? `다운로드 실패: ${e.message}` : "다운로드 실패");
    } finally {
      setDownloading(false);
    }
  };

  const total = cardnews?.slides.length ?? 0;
  const go = (delta: number) => {
    setIndex((i) => Math.max(0, Math.min(total - 1, i + delta)));
  };

  return (
    <AnimatePresence>
      {open && article && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-md"
        >
          <header className="flex items-center justify-between px-5 pt-5 text-white">
            <button
              onClick={onClose}
              className="text-sm text-white/70 hover:text-white"
            >
              ← 닫기
            </button>
            <h2 className="font-serif text-sm tracking-wide text-white/80">
              카드뉴스
            </h2>
            <div className="w-12" />
          </header>

          <div className="flex flex-1 items-center justify-center px-4">
            {/* 슬라이드 영역 */}
            {!cardnews && !loading && (
              <div className="flex max-w-sm flex-col items-center gap-4 text-center text-white">
                <p className="text-sm text-white/70">
                  이 기사를 인스타그램 카드뉴스 5장으로 변환합니다.
                </p>
                {hasKey ? (
                  <button
                    onClick={() => generate(false)}
                    className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                  >
                    📱 카드뉴스 생성하기
                  </button>
                ) : (
                  <p className="text-xs text-rose-300">
                    먼저 설정에서 AI API 키를 입력해주세요.
                  </p>
                )}
                {error && (
                  <p className="rounded-xl border border-rose-400/30 bg-rose-400/5 px-3 py-2 text-xs text-rose-300">
                    ⚠️ {error}
                  </p>
                )}
              </div>
            )}

            {loading && (
              <div className="text-sm text-white/70">슬라이드 만드는 중…</div>
            )}

            {cardnews && (
              <div className="relative flex w-full max-w-[540px] flex-col items-center gap-4">
                {/* 슬라이드 컨테이너 — 모든 슬라이드를 렌더링하되 현재 인덱스만 화면에 보이도록 */}
                <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
                  {cardnews.slides.map((s, i) => (
                    <div
                      key={i}
                      className={`absolute inset-0 transition-opacity duration-200 ${
                        i === index ? "opacity-100" : "pointer-events-none opacity-0"
                      }`}
                    >
                      <div
                        ref={(el) => {
                          slideRefs.current[i] = el;
                        }}
                      >
                        <Slide
                          slide={s}
                          index={i}
                          total={cardnews.slides.length}
                          backgroundUrl={article.image_url}
                          category={article.category}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 인디케이터 + 좌우 네비 */}
                <div className="flex w-full items-center justify-between text-white">
                  <button
                    onClick={() => go(-1)}
                    disabled={index === 0}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20 disabled:opacity-30"
                  >
                    ←
                  </button>
                  <div className="flex gap-1.5">
                    {cardnews.slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === index ? "w-6 bg-white" : "w-1.5 bg-white/30"
                        }`}
                        aria-label={`슬라이드 ${i + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => go(1)}
                    disabled={index >= total - 1}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20 disabled:opacity-30"
                  >
                    →
                  </button>
                </div>

                {error && (
                  <p className="w-full rounded-xl border border-rose-400/30 bg-rose-400/5 px-3 py-2 text-xs text-rose-300">
                    ⚠️ {error}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 액션 바 */}
          {cardnews && (
            <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
              <button
                onClick={() => generate(true)}
                disabled={loading}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-xs text-white hover:bg-white/20 disabled:opacity-50"
              >
                {loading ? "재생성 중…" : "🔄 다시 만들기"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={downloadCurrent}
                  disabled={downloading}
                  className="rounded-xl bg-white/10 px-4 py-2.5 text-xs text-white hover:bg-white/20 disabled:opacity-50"
                >
                  📥 현재 슬라이드
                </button>
                <button
                  onClick={downloadAll}
                  disabled={downloading}
                  className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {downloading ? "저장 중…" : "📦 전체 PNG 저장"}
                </button>
              </div>
            </footer>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

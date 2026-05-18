"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Article, Summary } from "@/types/article";
import { getApiKey, getProvider, getModel, hasUsableConfig } from "@/lib/settings";
import { summarizeArticle } from "@/lib/api";
import CryptoWidget from "./CryptoWidget";

type Props = {
  article: Article | null;
  open: boolean;
  onClose: () => void;
  onMakeCardNews?: () => void;
};

export default function SummaryPanel({ article, open, onClose, onMakeCardNews }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setHasKey(hasUsableConfig());
  }, [open]);

  useEffect(() => {
    setSummary(article?.summary ?? null);
    setError(null);
  }, [article]);

  const onGenerate = async () => {
    if (!article) return;
    const apiKey = getApiKey();
    const provider = getProvider();
    const model = getModel();
    setLoading(true);
    setError(null);
    try {
      const res = await summarizeArticle(article._id, {
        provider,
        apiKey,
        model: model || undefined,
      });
      setSummary(res.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "요약 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && article && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-30 bg-black/30 backdrop-blur-[6px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
            className="glass absolute inset-x-0 bottom-0 z-40 rounded-t-3xl px-6 pt-3 pb-10"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/30" />

            {article.category === "crypto" && (
              <div className="mb-4">
                <CryptoWidget />
              </div>
            )}

            {summary ? (
              <div className="space-y-5">
                <div>
                  <div className="mb-1 text-xs uppercase tracking-[0.2em] text-white/50">
                    💡 핵심 결론
                  </div>
                  <p className="text-lg font-semibold leading-snug text-white">
                    {summary.headline}
                  </p>
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase tracking-[0.2em] text-white/50">
                    📌 배경과 전망
                  </div>
                  <p className="text-sm leading-relaxed text-white/85">
                    {summary.background}
                  </p>
                </div>
              </div>
            ) : hasKey ? (
              <div className="space-y-3 py-3">
                <p className="text-sm text-white/70">
                  이 기사의 AI 요약이 아직 없습니다.
                </p>
                <button
                  onClick={onGenerate}
                  disabled={loading}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {loading ? "요약 생성 중…" : "💡 AI 요약 생성하기"}
                </button>
                {error && (
                  <div className="space-y-2 rounded-xl border border-rose-400/30 bg-rose-400/5 p-3">
                    <p className="text-xs leading-relaxed text-rose-300">⚠️ {error}</p>
                    <Link
                      href="/settings"
                      className="inline-block text-[11px] text-white/70 underline underline-offset-2 hover:text-white"
                    >
                      설정에서 키/모델 변경 →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 py-3">
                <p className="text-sm text-white/70">
                  AI 요약을 보려면 Anthropic API 키를 설정해 주세요.
                </p>
                <Link
                  href="/settings"
                  className="inline-block rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  ⚙ 설정으로 이동
                </Link>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-white/60 underline-offset-4 hover:underline"
              >
                원문 보기 ↗
              </a>
              {onMakeCardNews && (
                <button
                  onClick={onMakeCardNews}
                  className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  📱 카드뉴스 만들기
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

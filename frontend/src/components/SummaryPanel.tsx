"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Article } from "@/types/article";
import CryptoWidget from "./CryptoWidget";

type Props = {
  article: Article | null;
  open: boolean;
  onClose: () => void;
};

export default function SummaryPanel({ article, open, onClose }: Props) {
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
            {article.summary ? (
              <div className="space-y-5">
                <div>
                  <div className="mb-1 text-xs uppercase tracking-[0.2em] text-white/50">
                    💡 핵심 결론
                  </div>
                  <p className="text-lg font-semibold leading-snug text-white">
                    {article.summary.headline}
                  </p>
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase tracking-[0.2em] text-white/50">
                    📌 배경과 전망
                  </div>
                  <p className="text-sm leading-relaxed text-white/85">
                    {article.summary.background}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/70">
                요약이 아직 준비되지 않았습니다.
              </p>
            )}
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-6 inline-block text-xs text-white/60 underline-offset-4 hover:underline"
            >
              원문 보기 ↗
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

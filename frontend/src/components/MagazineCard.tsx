"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import type { Article } from "@/types/article";

const CATEGORY_LABEL: Record<string, string> = {
  crypto: "돈과 시장 · 암호화폐",
  realestate: "돈과 시장 · 부동산",
  tech: "기술과 미래",
  society: "세상 이야기",
  fun: "도파민과 힐링",
};

type Props = {
  article: Article;
  onSwipeUp: () => void;
};

export default function MagazineCard({ article, onSwipeUp }: Props) {
  const y = useMotionValue(0);
  const overlayOpacity = useTransform(y, [-200, 0], [0.5, 0]);
  const hintOpacity = useTransform(y, [-80, 0, 40], [0, 1, 1]);

  const bg = article.image_url
    ? `url("${article.image_url}")`
    : "linear-gradient(135deg, #1f2937 0%, #111827 100%)";

  return (
    <motion.section
      className="snap-page relative h-[100dvh] w-full overflow-hidden bg-black"
      style={{ y }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.25}
      onDragEnd={(_, info) => {
        if (info.offset.y < -100 || info.velocity.y < -500) {
          onSwipeUp();
        }
      }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: bg }}
      />
      <motion.div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />

      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-5">
        <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
          {CATEGORY_LABEL[article.category] ?? article.category}
        </span>
        <span className="text-[10px] tracking-widest text-white/40">PRISM</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-16">
        <h1 className="font-serif text-3xl font-bold leading-[1.2] text-white drop-shadow-md sm:text-4xl">
          {article.title}
        </h1>
      </div>

      <motion.div
        style={{ opacity: hintOpacity }}
        className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex flex-col items-center gap-1 text-white/65"
      >
        <div className="h-1 w-10 rounded-full bg-white/70" />
        <span className="text-[11px] tracking-[0.2em]">위로 스와이프 · AI 요약</span>
      </motion.div>
    </motion.section>
  );
}

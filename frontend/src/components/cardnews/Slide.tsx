"use client";

import type { CardSlide } from "@/types/article";
import { labelFor } from "@/lib/categories";

type Props = {
  slide: CardSlide;
  index: number;
  total: number;
  backgroundUrl?: string | null;
  category?: string;
};

export default function Slide({
  slide,
  index,
  total,
  backgroundUrl,
  category,
}: Props) {
  const bg = backgroundUrl
    ? `linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 100%), url("${backgroundUrl}")`
    : "linear-gradient(135deg, #111827 0%, #0a0a0a 100%)";

  return (
    <div
      className="relative flex aspect-square w-full max-w-[540px] flex-col overflow-hidden rounded-3xl bg-cover bg-center text-white shadow-2xl"
      style={{ backgroundImage: bg }}
    >
      <div className="flex items-center justify-between px-7 pt-7 text-[10px] uppercase tracking-[0.25em] text-white/70">
        <span>{category ? labelFor(category) : "PRISM"}</span>
        <span>
          {index + 1} / {total}
        </span>
      </div>

      <div className="flex-1 px-7 pb-7">
        {slide.type === "cover" && (
          <div className="flex h-full flex-col justify-end">
            <h2 className="font-serif text-[34px] font-bold leading-[1.15] tracking-tight">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="mt-3 text-base leading-snug text-white/80">
                {slide.subtitle}
              </p>
            )}
          </div>
        )}

        {slide.type === "context" && (
          <div className="flex h-full flex-col justify-center">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/50">
              지금, 이 이슈
            </div>
            <p className="font-serif text-2xl leading-snug">{slide.body}</p>
          </div>
        )}

        {slide.type === "point" && (
          <div className="flex h-full flex-col justify-center">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/50">
              핵심 포인트
            </div>
            <h3 className="font-serif text-3xl font-bold leading-tight">
              {slide.heading}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-white/85">
              {slide.body}
            </p>
          </div>
        )}

        {slide.type === "outro" && (
          <div className="flex h-full flex-col justify-end">
            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/50">
              결론
            </div>
            <h2 className="font-serif text-[30px] font-bold leading-[1.2]">
              {slide.headline}
            </h2>
            <div className="mt-6 inline-block self-start rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-medium tracking-[0.2em]">
              {slide.cta || "PRISM"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

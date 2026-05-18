"use client";

import type { CardSlide } from "@/types/article";

type Props = {
  slide: CardSlide;
  index: number;
  total: number;
  backgroundUrl?: string | null;
  category?: string;
};

export default function Slide({ slide, backgroundUrl }: Props) {
  const bg = backgroundUrl
    ? `linear-gradient(160deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.88) 100%), url("${backgroundUrl}")`
    : "linear-gradient(160deg, #1a1a2e 0%, #0a0a0a 100%)";

  return (
    <div
      className="relative flex aspect-square w-full max-w-[540px] flex-col overflow-hidden rounded-3xl bg-cover bg-center text-white shadow-2xl"
      style={{ backgroundImage: bg }}
    >
      <div className="flex flex-1 flex-col px-8 pb-8 pt-8">
        {slide.type === "cover" && (
          <div className="flex h-full flex-col justify-end gap-3">
            <h2 className="font-display text-[38px] leading-[1.1] tracking-tight text-white drop-shadow-lg">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="font-serif text-[17px] leading-snug text-amber-200">
                {slide.subtitle}
              </p>
            )}
          </div>
        )}

        {slide.type === "context" && (
          <div className="flex h-full flex-col justify-center gap-4">
            <div className="h-[3px] w-10 rounded-full bg-amber-400" />
            <p className="font-serif text-[22px] leading-[1.6] text-amber-100">
              {slide.body}
            </p>
          </div>
        )}

        {slide.type === "point" && (
          <div className="flex h-full flex-col justify-center gap-4">
            <h3 className="font-display text-[32px] leading-tight text-white drop-shadow-md">
              {slide.heading}
            </h3>
            <div className="h-px w-full bg-white/20" />
            <p className="font-serif text-[17px] leading-relaxed text-amber-100">
              {slide.body}
            </p>
          </div>
        )}

        {slide.type === "outro" && (
          <div className="flex h-full flex-col justify-end gap-3">
            <div className="h-[3px] w-10 rounded-full bg-amber-400" />
            <h2 className="font-display text-[34px] leading-[1.15] text-white drop-shadow-md">
              {slide.headline}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}

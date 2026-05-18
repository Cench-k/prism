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
    ? `linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 100%), url("${backgroundUrl}")`
    : "linear-gradient(135deg, #111827 0%, #0a0a0a 100%)";

  return (
    <div
      className="relative flex aspect-square w-full max-w-[540px] flex-col overflow-hidden rounded-3xl bg-cover bg-center text-white shadow-2xl"
      style={{ backgroundImage: bg }}
    >
      <div className="flex flex-1 px-7 pb-7 pt-7">
        {slide.type === "cover" && (
          <div className="flex h-full w-full flex-col justify-end">
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
          <div className="flex h-full w-full flex-col justify-center">
            <p className="font-serif text-2xl leading-snug">{slide.body}</p>
          </div>
        )}

        {slide.type === "point" && (
          <div className="flex h-full w-full flex-col justify-center">
            <h3 className="font-serif text-3xl font-bold leading-tight">
              {slide.heading}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-white/85">
              {slide.body}
            </p>
          </div>
        )}

        {slide.type === "outro" && (
          <div className="flex h-full w-full flex-col justify-end">
            <h2 className="font-serif text-[30px] font-bold leading-[1.2]">
              {slide.headline}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}

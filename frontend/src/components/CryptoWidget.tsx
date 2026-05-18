"use client";

import { useEffect, useState } from "react";
import { fetchCryptoWidget } from "@/lib/api";
import type { CryptoTicker } from "@/types/article";

export default function CryptoWidget() {
  const [tickers, setTickers] = useState<CryptoTicker[] | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchCryptoWidget();
        if (active) setTickers(data.tickers);
      } catch {
        if (active) setTickers([]);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!tickers || tickers.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {tickers.map((t) => {
        const change = t.change_24h_pct ?? 0;
        const positive = change >= 0;
        return (
          <div
            key={t.symbol}
            className="flex-shrink-0 rounded-2xl bg-white/10 px-3 py-2 backdrop-blur-md"
          >
            <div className="text-[10px] uppercase tracking-widest text-white/60">
              {t.symbol}
            </div>
            <div className="text-sm font-semibold text-white">
              {t.price_usd != null
                ? `$${t.price_usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                : "—"}
            </div>
            <div
              className={`text-[11px] font-medium ${
                positive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {positive ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

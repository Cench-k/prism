"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PROVIDERS,
  PROVIDER_META,
  type AiProvider,
  getProvider,
  setProvider as saveProvider,
  getApiKey,
  setApiKey as saveApiKey,
  clearApiKey,
  getModel,
  setModel as saveModel,
} from "@/lib/settings";

export default function SettingsPage() {
  const [provider, setProviderState] = useState<AiProvider>("anthropic");
  const [key, setKey] = useState("");
  const [model, setModelState] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProviderState(getProvider());
    setKey(getApiKey());
    setModelState(getModel());
  }, []);

  const meta = PROVIDER_META[provider];

  const onSave = () => {
    saveProvider(provider);
    saveApiKey(key);
    saveModel(model);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const onClear = () => {
    clearApiKey();
    setKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const onProviderChange = (p: AiProvider) => {
    setProviderState(p);
    // 모델이 비어있을 때만 기본값 힌트 변경. 사용자가 명시한 모델은 유지.
  };

  return (
    <main className="min-h-[100dvh] bg-black px-6 pb-16 pt-12 text-white">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          ← 매거진으로
        </Link>

        <h1 className="mb-2 font-serif text-3xl font-bold">설정</h1>
        <p className="mb-10 text-sm text-white/60">
          AI 제공사와 API 키를 입력하면 요약·카드뉴스 기능을 사용할 수 있습니다.
          키는 이 브라우저에만 저장되며 서버에는 절대 보관되지 않습니다.
        </p>

        <section className="space-y-6">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/50">
              AI 제공사
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p}
                  onClick={() => onProviderChange(p)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                    provider === p
                      ? "border-white bg-white text-black"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {PROVIDER_META[p].label.split(" ")[0]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-white/40">{meta.label}</p>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/50">
              API Key
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={meta.keyHint}
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 pr-16 font-mono text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white"
              >
                {show ? "숨김" : "표시"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/50">
              모델 <span className="ml-1 text-white/40">(선택)</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModelState(e.target.value)}
              placeholder={`기본값: ${meta.defaultModel}`}
              spellCheck={false}
              autoComplete="off"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-white/40">
              비워두면 기본 모델을 사용합니다.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onSave}
              disabled={!key.trim()}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              저장
            </button>
            {getApiKey() && (
              <button
                onClick={onClear}
                className="text-sm text-white/60 hover:text-rose-400"
              >
                키 삭제
              </button>
            )}
            {saved && <span className="text-xs text-emerald-400">저장됨</span>}
          </div>
        </section>

        <section className="mt-12 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-relaxed text-white/70">
          <h2 className="font-semibold text-white">{meta.label} 키 발급 방법</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <a
                href={meta.consoleUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sky-400 underline-offset-2 hover:underline"
              >
                {new URL(meta.consoleUrl).hostname}
              </a>
              에서 로그인 후 새 키 생성
            </li>
            <li>키를 복사해 위에 붙여넣고 저장</li>
          </ol>
          <p className="text-xs text-white/40">{meta.pricingNote}</p>
        </section>
      </div>
    </main>
  );
}

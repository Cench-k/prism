"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/settings";

export default function SettingsPage() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setValue(getApiKey() ?? "");
  }, []);

  const onSave = () => {
    setApiKey(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const onClear = () => {
    clearApiKey();
    setValue("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const valid = value.startsWith("sk-ant-") && value.length > 20;

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
          Anthropic API 키를 입력하면 AI 요약과 카드뉴스 생성 기능을 사용할 수 있습니다.
          키는 이 브라우저에만 저장되며 서버에는 절대 보관되지 않습니다.
        </p>

        <section className="space-y-3">
          <label className="block text-xs uppercase tracking-[0.2em] text-white/50">
            Anthropic API Key
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk-ant-api03-..."
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
          {value && !valid && (
            <p className="text-xs text-amber-400">
              키는 `sk-ant-` 로 시작해야 합니다.
            </p>
          )}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onSave}
              disabled={!valid && value.length > 0}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              저장
            </button>
            {getApiKey() && (
              <button
                onClick={onClear}
                className="text-sm text-white/60 hover:text-rose-400"
              >
                삭제
              </button>
            )}
            {saved && <span className="text-xs text-emerald-400">저장됨</span>}
          </div>
        </section>

        <section className="mt-12 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-relaxed text-white/70">
          <h2 className="font-semibold text-white">키 발급 방법</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer noopener"
                className="text-sky-400 underline-offset-2 hover:underline"
              >
                console.anthropic.com
              </a>
              에서 회원가입
            </li>
            <li>Settings → API Keys → Create Key</li>
            <li>키를 복사해 위에 붙여넣고 저장</li>
          </ol>
          <p className="text-xs text-white/40">
            Haiku 4.5 기준 기사 1건 요약 ≈ $0.0001. 신규 계정 무료 크레딧으로 수천 건 가능.
          </p>
        </section>
      </div>
    </main>
  );
}

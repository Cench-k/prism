"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const CUSTOM_OPTION = "__custom__";

export default function SettingsPage() {
  const [provider, setProviderState] = useState<AiProvider>("anthropic");
  const [key, setKey] = useState("");
  const [modelSelect, setModelSelect] = useState<string>("");
  const [customModel, setCustomModel] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const meta = PROVIDER_META[provider];

  useEffect(() => {
    const p = getProvider();
    setProviderState(p);
    setKey(getApiKey());

    const storedModel = getModel();
    if (!storedModel) {
      setModelSelect("");
    } else {
      const inCatalog = PROVIDER_META[p].models.some((m) => m.id === storedModel);
      if (inCatalog) {
        setModelSelect(storedModel);
        setCustomModel("");
      } else {
        setModelSelect(CUSTOM_OPTION);
        setCustomModel(storedModel);
      }
    }
  }, []);

  const effectiveModel = useMemo(() => {
    if (modelSelect === CUSTOM_OPTION) return customModel.trim();
    return modelSelect; // "" 이면 기본값 사용
  }, [modelSelect, customModel]);

  const onProviderChange = (p: AiProvider) => {
    setProviderState(p);
    setModelSelect("");
    setCustomModel("");
  };

  const onSave = () => {
    saveProvider(provider);
    saveApiKey(key);
    saveModel(effectiveModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const onClear = () => {
    clearApiKey();
    setKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
          {/* Provider */}
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

          {/* API Key */}
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

          {/* Model */}
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/50">
              모델
            </label>
            <select
              value={modelSelect}
              onChange={(e) => setModelSelect(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/40 focus:outline-none"
            >
              <option value="" className="bg-black">
                기본값 ({meta.defaultModel})
              </option>
              {meta.models.map((m) => (
                <option key={m.id} value={m.id} className="bg-black">
                  {m.label}
                  {m.tag ? ` · ${m.tag}` : ""}
                </option>
              ))}
              <option value={CUSTOM_OPTION} className="bg-black">
                직접 입력…
              </option>
            </select>

            {modelSelect === CUSTOM_OPTION && (
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="모델 ID 직접 입력 (예: claude-opus-4-7)"
                spellCheck={false}
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
              />
            )}

            {modelSelect && modelSelect !== CUSTOM_OPTION && (
              <p className="mt-2 text-[11px] text-white/40">
                {meta.models.find((m) => m.id === modelSelect)?.tag === "무료 한도" &&
                  "✅ 이 모델은 무료 한도 내에서 사용 가능합니다 (provider 정책 적용)."}
                {meta.models.find((m) => m.id === modelSelect)?.tag === "고품질" &&
                  "⚠️ 고품질 모델은 호출 비용이 상대적으로 높습니다."}
              </p>
            )}
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
          <h2 className="font-semibold text-white">{meta.label} 키 발급</h2>
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

        <p className="mt-6 text-[11px] leading-relaxed text-white/40">
          💡 모델 ID가 정확하지 않으면 요약 생성 시 오류 메시지가 표시됩니다. 그럴 땐 위 드롭다운에서 다른 모델을 고르거나 “기본값”을 선택하세요.
        </p>
      </div>
    </main>
  );
}

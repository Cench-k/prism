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
  getCachedLiveModels,
  setCachedLiveModels,
  clearCachedLiveModels,
} from "@/lib/settings";
import { fetchLiveModels, type LiveModel } from "@/lib/api";

const CUSTOM_OPTION = "__custom__";

function formatAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "방금";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

export default function SettingsPage() {
  const [provider, setProviderState] = useState<AiProvider>("anthropic");
  const [key, setKey] = useState("");
  const [modelSelect, setModelSelect] = useState<string>("");
  const [customModel, setCustomModel] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const [liveModels, setLiveModels] = useState<LiveModel[]>([]);
  const [liveFetchedAt, setLiveFetchedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const meta = PROVIDER_META[provider];

  // 초기 로드
  useEffect(() => {
    const p = getProvider();
    setProviderState(p);
    setKey(getApiKey());

    const cached = getCachedLiveModels(p);
    if (cached) {
      setLiveModels(cached.models);
      setLiveFetchedAt(cached.fetchedAt);
    }

    const storedModel = getModel();
    if (!storedModel) {
      setModelSelect("");
    } else {
      const inCatalog =
        PROVIDER_META[p].models.some((m) => m.id === storedModel) ||
        (cached?.models ?? []).some((m) => m.id === storedModel);
      if (inCatalog) {
        setModelSelect(storedModel);
        setCustomModel("");
      } else {
        setModelSelect(CUSTOM_OPTION);
        setCustomModel(storedModel);
      }
    }
  }, []);

  // provider 전환 시 캐시 다시 로드
  useEffect(() => {
    const cached = getCachedLiveModels(provider);
    if (cached) {
      setLiveModels(cached.models);
      setLiveFetchedAt(cached.fetchedAt);
    } else {
      setLiveModels([]);
      setLiveFetchedAt(null);
    }
    setRefreshError(null);
  }, [provider]);

  // 카탈로그 + 라이브 모델 병합 (중복 제거, 라이브 우선)
  const mergedModels = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; label: string; isLive: boolean }[] = [];
    for (const m of liveModels) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      result.push({ id: m.id, label: m.label, isLive: true });
    }
    for (const m of meta.models) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      result.push({
        id: m.id,
        label: m.label + (m.tag ? ` · ${m.tag}` : ""),
        isLive: false,
      });
    }
    return result;
  }, [liveModels, meta]);

  const effectiveModel = useMemo(() => {
    if (modelSelect === CUSTOM_OPTION) return customModel.trim();
    return modelSelect;
  }, [modelSelect, customModel]);

  const onProviderChange = (p: AiProvider) => {
    setProviderState(p);
    setModelSelect("");
    setCustomModel("");
  };

  const onRefreshModels = async () => {
    if (!key.trim()) {
      setRefreshError("먼저 API 키를 입력하고 저장해주세요.");
      return;
    }
    setRefreshing(true);
    setRefreshError(null);
    try {
      const models = await fetchLiveModels(provider, key.trim());
      setLiveModels(models);
      const now = Date.now();
      setLiveFetchedAt(now);
      setCachedLiveModels(provider, models);
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "모델 목록을 가져오지 못했습니다.");
    } finally {
      setRefreshing(false);
    }
  };

  const onClearCache = () => {
    clearCachedLiveModels(provider);
    setLiveModels([]);
    setLiveFetchedAt(null);
  };

  const onSave = () => {
    saveProvider(provider);
    saveApiKey(key);
    saveModel(effectiveModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const onClearKey = () => {
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
            <div className="mb-2 flex items-end justify-between">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50">
                모델
              </label>
              <button
                onClick={onRefreshModels}
                disabled={refreshing || !key.trim()}
                className="text-[11px] text-sky-400 hover:text-sky-300 disabled:opacity-40"
              >
                {refreshing ? "불러오는 중…" : "🔄 최신 목록 새로고침"}
              </button>
            </div>

            <select
              value={modelSelect}
              onChange={(e) => setModelSelect(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/40 focus:outline-none"
            >
              <option value="" className="bg-black">
                기본값 ({meta.defaultModel})
              </option>

              {liveModels.length > 0 && (
                <optgroup label="실시간 (provider에서 가져옴)">
                  {liveModels.map((m) => (
                    <option key={`live-${m.id}`} value={m.id} className="bg-black">
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="기본 카탈로그">
                {meta.models.map((m) => (
                  <option
                    key={`cat-${m.id}`}
                    value={m.id}
                    className="bg-black"
                    disabled={liveModels.some((lm) => lm.id === m.id)}
                  >
                    {m.label}
                    {m.tag ? ` · ${m.tag}` : ""}
                  </option>
                ))}
              </optgroup>

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

            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-white/40">
                {liveFetchedAt
                  ? `최신 목록 ${formatAgo(liveFetchedAt)} 갱신 (${liveModels.length}개)`
                  : "최신 목록 미수신 — 기본 카탈로그 사용 중"}
              </span>
              {liveFetchedAt && (
                <button
                  onClick={onClearCache}
                  className="text-white/40 hover:text-white/70"
                >
                  초기화
                </button>
              )}
            </div>

            {refreshError && (
              <p className="mt-2 rounded-xl border border-rose-400/30 bg-rose-400/5 px-3 py-2 text-[11px] text-rose-300">
                ⚠️ {refreshError}
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
                onClick={onClearKey}
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
            <li>
              <strong className="text-white">🔄 최신 목록 새로고침</strong> 클릭하면
              현재 사용 가능한 모델을 실시간으로 가져옵니다
            </li>
          </ol>
          <p className="text-xs text-white/40">{meta.pricingNote}</p>
        </section>
      </div>
    </main>
  );
}

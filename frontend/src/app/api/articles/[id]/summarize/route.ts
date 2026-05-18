import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const headers: Record<string, string> = {};
  for (const key of ["X-AI-Provider", "X-AI-Key", "X-AI-Model"]) {
    const val = request.headers.get(key);
    if (val) headers[key] = val;
  }

  try {
    const res = await fetch(`${BACKEND}/api/articles/${params.id}/summarize`, {
      method: "POST",
      headers,
    });
    const data = await res.json().catch(() => ({ detail: `백엔드 응답 파싱 실패 (status: ${res.status})` }));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { detail: `백엔드 연결 실패: ${msg}` },
      { status: 502 }
    );
  }
}

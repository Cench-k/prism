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

  const res = await fetch(`${BACKEND}/api/articles/${params.id}/summarize`, {
    method: "POST",
    headers,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

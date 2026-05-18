import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//.test(url)) {
    return new NextResponse("Invalid url", { status: 400 });
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return new NextResponse("Fetch failed", { status: 502 });
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  }
}
